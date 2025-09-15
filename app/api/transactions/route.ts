import { type NextRequest, NextResponse } from "next/server"
import { sql, withTransaction } from "@/lib/database"
import { verifySession } from "@/lib/auth"
import { ZodError } from "zod"
import {
  transactionSchema,
  transactionUpdateSchema,
  transactionQuerySchema,
  transactionIdSchema,
} from "@/lib/validation/transaction"

function getDeviceId(request: NextRequest): string {
  return request.headers.get("x-device-id") || request.headers.get("user-agent") || "unknown-device"
}

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!sessionToken) return null

  const deviceId = getDeviceId(request)
  return await verifySession(sessionToken, deviceId)
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries())
    const { startDate, endDate, limit, offset } = transactionQuerySchema.parse(rawQuery)

    const conditions = []
    if (startDate && endDate) {
      conditions.push(sql`t.transaction_date BETWEEN ${startDate} AND ${endDate}`)
    } else if (startDate) {
      conditions.push(sql`t.transaction_date >= ${startDate}`)
    } else if (endDate) {
      conditions.push(sql`t.transaction_date <= ${endDate}`)
    }

    const whereClause = conditions.length > 0 ? sql`AND ${sql.join(conditions, sql` AND `)}` : sql``

    const transactions = await sql`
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.created_at,
        t.account_id,
        t.category_id,
        a.name as account_name,
        c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId} ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) as count
      FROM transactions t
      WHERE t.user_id = ${userId} ${whereClause}
    `

    const total = Number.parseInt(count as any)

    return NextResponse.json({
      transactions,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    console.error("Get transactions error:", error)
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, amount, description, category, account, date } = transactionSchema.parse(
      await request.json(),
    )

    let result
    try {
      result = await withTransaction(async (client) => {
        const {
          rows: accountRows,
        } = await client.query(
          "SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2",
          [account, userId],
        )
        const accountRecord = accountRows[0]
        if (!accountRecord) {
          throw new Error("Account not found or access denied")
        }

        const {
          rows: categoryRows,
        } = await client.query(
          "SELECT id FROM categories WHERE name = $1 AND type = $2 AND user_id = $3",
          [category, type, userId],
        )
        const categoryRecord = categoryRows[0]
        if (!categoryRecord) {
          throw new Error("Category not found")
        }

        if (type === "expense" && Number(accountRecord.balance) < amount) {
          throw new Error("Insufficient account balance")
        }

        const { rows: transactionRows } = await client.query(
          `INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, transaction_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [userId, account, categoryRecord.id, type, amount, description.trim(), date],
        )
        const transaction = transactionRows[0]

        if (type === "income") {
          await client.query(
            "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
            [amount, account, userId],
          )
        } else {
          await client.query(
            "UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
            [amount, account, userId],
          )
        }

        return transaction
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Connection terminated unexpectedly")
      ) {
        console.error("Create transaction error:", error)
        return NextResponse.json(
          { error: "Database connection lost; please retry" },
          { status: 503 },
        )
      }
      throw error
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    console.error("Create transaction error:", error)

    // Return specific error messages for validation failures
    if (error.message.includes("not found") || error.message.includes("access denied")) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error.message.includes("Insufficient")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id, type, amount, description, category, account, date } =
      transactionUpdateSchema.parse(await request.json())

    let result
    try {
      result = await withTransaction(async (client) => {
        const {
          rows: oldRows,
        } = await client.query(
          `SELECT t.*, a.balance as account_balance FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.id = $1 AND t.user_id = $2`,
          [id, userId],
        )
        const oldTransaction = oldRows[0]
        if (!oldTransaction) {
          throw new Error("Transaction not found or access denied")
        }

        const {
          rows: newAccountRows,
        } = await client.query(
          "SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2",
          [account, userId],
        )
        const newAccountRecord = newAccountRows[0]
        if (!newAccountRecord) {
          throw new Error("Account not found or access denied")
        }

        const {
          rows: categoryRows,
        } = await client.query(
          "SELECT id FROM categories WHERE name = $1 AND type = $2 AND user_id = $3",
          [category, type, userId],
        )
        const categoryRecord = categoryRows[0]
        if (!categoryRecord) {
          throw new Error("Category not found")
        }

        if (oldTransaction.type === "income") {
          await client.query(
            "UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
            [oldTransaction.amount, oldTransaction.account_id],
          )
        } else {
          await client.query(
            "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
            [oldTransaction.amount, oldTransaction.account_id],
          )
        }

        const { rows: updatedAccountRows } = await client.query(
          "SELECT balance FROM accounts WHERE id = $1",
          [account],
        )
        const updatedAccountBalance = updatedAccountRows[0]
        if (type === "expense" && Number(updatedAccountBalance.balance) < amount) {
          throw new Error("Insufficient account balance for this transaction")
        }

        const { rows: transactionRows } = await client.query(
          `UPDATE transactions SET type = $1, amount = $2, description = $3, category_id = $4, account_id = $5, transaction_date = $6, updated_at = NOW() WHERE id = $7 AND user_id = $8 RETURNING *`,
          [type, amount, description.trim(), categoryRecord.id, account, date, id, userId],
        )
        const transaction = transactionRows[0]

        if (type === "income") {
          await client.query(
            "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
            [amount, account],
          )
        } else {
          await client.query(
            "UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
            [amount, account],
          )
        }

        return transaction
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Connection terminated unexpectedly")
      ) {
        console.error("Update transaction error:", error)
        return NextResponse.json(
          { error: "Database connection lost; please retry" },
          { status: 503 },
        )
      }
      throw error
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    console.error("Update transaction error:", error)

    // Return specific error messages for validation failures
    if (error.message.includes("not found") || error.message.includes("access denied")) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error.message.includes("Insufficient")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries())
    const { id } = transactionIdSchema.parse(rawQuery)

    let result
    try {
      result = await withTransaction(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
          [id, userId],
        )
        const transaction = rows[0]
        if (!transaction) {
          throw new Error("Transaction not found or access denied")
        }

        await client.query(
          "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
          [id, userId],
        )

        if (transaction.type === "income") {
          await client.query(
            "UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
            [transaction.amount, transaction.account_id],
          )
        } else {
          await client.query(
            "UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
            [transaction.amount, transaction.account_id],
          )
        }

        return { success: true }
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Connection terminated unexpectedly")
      ) {
        console.error("Delete transaction error:", error)
        return NextResponse.json(
          { error: "Database connection lost; please retry" },
          { status: 503 },
        )
      }
      throw error
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 })
    }
    console.error("Delete transaction error:", error)

    if (error.message.includes("not found") || error.message.includes("access denied")) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
