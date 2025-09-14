import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { verifySession } from "@/lib/auth"

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
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")

    const limit = Number.parseInt(limitParam || "50")
    const offset = Number.parseInt(offsetParam || "0")

    if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 0 || offset < 0) {
      return NextResponse.json({ error: "Limit and offset must be non-negative integers" }, { status: 400 })
    }

    let startDate: Date | undefined
    if (startDateParam) {
      startDate = new Date(startDateParam)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 })
      }
    }

    let endDate: Date | undefined
    if (endDateParam) {
      endDate = new Date(endDateParam)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
      }
    }

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

    const { type, amount, description, category, account, date } = await request.json()

    // Validate required fields
    if (!type || !amount || !description || !category || !account || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // Validate type
    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ error: "Type must be 'income' or 'expense'" }, { status: 400 })
    }

    // Validate date
    const transactionDate = new Date(date)
    if (isNaN(transactionDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Verify account belongs to user
      const [accountRecord] = await sql`
        SELECT id, balance FROM accounts 
        WHERE id = ${account} AND user_id = ${userId}
      `

      if (!accountRecord) {
        throw new Error("Account not found or access denied")
      }

      // Get category ID
      const [categoryRecord] = await sql`
        SELECT id FROM categories 
        WHERE name = ${category} AND type = ${type} AND user_id = ${userId}
      `

      if (!categoryRecord) {
        throw new Error("Category not found")
      }

      // For expenses, check if account has sufficient balance
      if (type === "expense" && accountRecord.balance < amount) {
        throw new Error("Insufficient account balance")
      }

      // Insert transaction
      const [transaction] = await sql`
        INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, transaction_date)
        VALUES (${userId}, ${account}, ${categoryRecord.id}, ${type}, ${amount}, ${description.trim()}, ${date})
        RETURNING *
      `

      // Update account balance
      if (type === "income") {
        await sql`
          UPDATE accounts 
          SET balance = balance + ${amount}, updated_at = NOW()
          WHERE id = ${account} AND user_id = ${userId}
        `
      } else {
        await sql`
          UPDATE accounts 
          SET balance = balance - ${amount}, updated_at = NOW()
          WHERE id = ${account} AND user_id = ${userId}
        `
      }

      return transaction
    })

    return NextResponse.json(result)
  } catch (error) {
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

    const { id, type, amount, description, category, account, date } = await request.json()

    // Validate required fields
    if (!id || !type || !amount || !description || !category || !account || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // Validate type
    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ error: "Type must be 'income' or 'expense'" }, { status: 400 })
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Get old transaction for balance adjustment
      const [oldTransaction] = await sql`
        SELECT t.*, a.balance as account_balance FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.id = ${id} AND t.user_id = ${userId}
      `

      if (!oldTransaction) {
        throw new Error("Transaction not found or access denied")
      }

      // Verify new account belongs to user
      const [newAccountRecord] = await sql`
        SELECT id, balance FROM accounts 
        WHERE id = ${account} AND user_id = ${userId}
      `

      if (!newAccountRecord) {
        throw new Error("Account not found or access denied")
      }

      // Get category ID
      const [categoryRecord] = await sql`
        SELECT id FROM categories 
        WHERE name = ${category} AND type = ${type} AND user_id = ${userId}
      `

      if (!categoryRecord) {
        throw new Error("Category not found")
      }

      // Reverse old transaction effect on old account
      if (oldTransaction.type === "income") {
        await sql`
          UPDATE accounts 
          SET balance = balance - ${oldTransaction.amount}, updated_at = NOW()
          WHERE id = ${oldTransaction.account_id}
        `
      } else {
        await sql`
          UPDATE accounts 
          SET balance = balance + ${oldTransaction.amount}, updated_at = NOW()
          WHERE id = ${oldTransaction.account_id}
        `
      }

      // Check if new account has sufficient balance for expense
      const [updatedAccountBalance] = await sql`
        SELECT balance FROM accounts WHERE id = ${account}
      `

      if (type === "expense" && updatedAccountBalance.balance < amount) {
        throw new Error("Insufficient account balance for this transaction")
      }

      // Update transaction
      const [transaction] = await sql`
        UPDATE transactions 
        SET type = ${type}, amount = ${amount}, description = ${description.trim()}, 
            category_id = ${categoryRecord.id}, account_id = ${account}, 
            transaction_date = ${date}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `

      // Apply new transaction effect on new account
      if (type === "income") {
        await sql`
          UPDATE accounts 
          SET balance = balance + ${amount}, updated_at = NOW()
          WHERE id = ${account}
        `
      } else {
        await sql`
          UPDATE accounts 
          SET balance = balance - ${amount}, updated_at = NOW()
          WHERE id = ${account}
        `
      }

      return transaction
    })

    return NextResponse.json(result)
  } catch (error) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })
    }

    // Start transaction
    const result = await sql.begin(async (sql) => {
      // Get transaction for balance adjustment
      const [transaction] = await sql`
        SELECT * FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `

      if (!transaction) {
        throw new Error("Transaction not found or access denied")
      }

      // Delete transaction
      await sql`
        DELETE FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `

      // Adjust account balance (reverse the transaction effect)
      if (transaction.type === "income") {
        await sql`
          UPDATE accounts 
          SET balance = balance - ${transaction.amount}, updated_at = NOW()
          WHERE id = ${transaction.account_id}
        `
      } else {
        await sql`
          UPDATE accounts 
          SET balance = balance + ${transaction.amount}, updated_at = NOW()
          WHERE id = ${transaction.account_id}
        `
      }

      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Delete transaction error:", error)

    if (error.message.includes("not found") || error.message.includes("access denied")) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
