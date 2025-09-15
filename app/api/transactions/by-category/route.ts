import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { verifySession } from "@/lib/auth"
import { ZodError } from "zod"
import { transactionByCategoryQuerySchema } from "@/lib/validation/transaction"

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
    const { categoryId, categoryName, startDate, endDate, limit, offset } =
      transactionByCategoryQuerySchema.parse(rawQuery)

    let transactions, count

    const conditionsBase = []
    if (startDate && endDate) {
      conditionsBase.push(sql`t.transaction_date BETWEEN ${startDate} AND ${endDate}`)
    } else if (startDate) {
      conditionsBase.push(sql`t.transaction_date >= ${startDate}`)
    } else if (endDate) {
      conditionsBase.push(sql`t.transaction_date <= ${endDate}`)
    }

    if (categoryId) {
      const conditions = [sql`t.user_id = ${userId}`, sql`t.category_id = ${categoryId}`, ...conditionsBase]
      const where = sql.join(conditions, sql` AND `)
      transactions = await sql`
        SELECT
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${where}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const [countResult] = await sql`
        SELECT COUNT(*) as count
        FROM transactions t
        WHERE ${where}
      `
      count = countResult.count
    } else if (categoryName) {
      const conditions = [sql`t.user_id = ${userId}`, sql`c.name = ${categoryName}`, ...conditionsBase]
      const where = sql.join(conditions, sql` AND `)
      transactions = await sql`
        SELECT
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${where}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const [countResult] = await sql`
        SELECT COUNT(*) as count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${where}
      `
      count = countResult.count
    }

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
    console.error("Get transactions by category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
