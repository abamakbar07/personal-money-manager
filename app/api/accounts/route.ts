import { type NextRequest, NextResponse } from "next/server"
import { sql, withTransaction } from "@/lib/database"
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

    const accounts = await sql`
      SELECT * FROM accounts 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Get accounts error:", error)
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, type, balance, color } = await request.json()

    // Validate required fields
    if (!name || !type || balance === undefined || balance === null) {
      return NextResponse.json({ error: "Name, type, and balance are required" }, { status: 400 })
    }

    // Validate balance
    if (typeof balance !== "number" || balance < 0) {
      return NextResponse.json({ error: "Balance must be a non-negative number" }, { status: 400 })
    }

    // Validate name uniqueness for user
    const [existingAccount] = await sql`
      SELECT id FROM accounts 
      WHERE user_id = ${userId} AND LOWER(name) = LOWER(${name.trim()})
    `

    if (existingAccount) {
      return NextResponse.json({ error: "An account with this name already exists" }, { status: 400 })
    }

    const [account] = await sql`
      INSERT INTO accounts (user_id, name, type, balance, color)
      VALUES (${userId}, ${name.trim()}, ${type}, ${balance}, ${color || "blue"})
      RETURNING *
    `

    return NextResponse.json(account)
  } catch (error) {
    console.error("Create account error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, name, type, balance, color } = await request.json()

    // Validate required fields
    if (!id || !name || !type || balance === undefined || balance === null) {
      return NextResponse.json({ error: "ID, name, type, and balance are required" }, { status: 400 })
    }

    // Validate balance
    if (typeof balance !== "number" || balance < 0) {
      return NextResponse.json({ error: "Balance must be a non-negative number" }, { status: 400 })
    }

    // Check if account exists and belongs to user
    const [existingAccount] = await sql`
      SELECT id, balance FROM accounts 
      WHERE id = ${id} AND user_id = ${userId}
    `

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 })
    }

    // Validate name uniqueness for user (excluding current account)
    const [duplicateAccount] = await sql`
      SELECT id FROM accounts 
      WHERE user_id = ${userId} AND LOWER(name) = LOWER(${name.trim()}) AND id != ${id}
    `

    if (duplicateAccount) {
      return NextResponse.json({ error: "An account with this name already exists" }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const balanceDifference = balance - existingAccount.balance

      const { rows: accountRows } = await client.query(
        `UPDATE accounts SET name = $1, type = $2, balance = $3, color = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *`,
        [name.trim(), type, balance, color || "blue", id, userId],
      )
      const account = accountRows[0]

      if (balanceDifference !== 0) {
        const { rows: categoryRows } = await client.query(
          "SELECT id FROM categories WHERE user_id = $1 AND name = 'Other' AND type = $2",
          [userId, balanceDifference > 0 ? "income" : "expense"],
        )
        const otherCategory = categoryRows[0]
        if (otherCategory) {
          await client.query(
            `INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              userId,
              id,
              otherCategory.id,
              balanceDifference > 0 ? "income" : "expense",
              Math.abs(balanceDifference),
              `Balance adjustment for ${name.trim()}`,
              new Date().toISOString().split("T")[0],
            ],
          )
        }
      }

      return account
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Update account error:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
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
      return NextResponse.json({ error: "Account ID required" }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const { rows: accountRows } = await client.query(
        "SELECT id FROM accounts WHERE id = $1 AND user_id = $2",
        [id, userId],
      )
      const account = accountRows[0]
      if (!account) {
        throw new Error("Account not found or access denied")
      }

      await client.query(
        "DELETE FROM transactions WHERE account_id = $1 AND user_id = $2",
        [id, userId],
      )

      await client.query(
        "DELETE FROM accounts WHERE id = $1 AND user_id = $2",
        [id, userId],
      )

      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Delete account error:", error)

    if (error.message.includes("not found") || error.message.includes("access denied")) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
