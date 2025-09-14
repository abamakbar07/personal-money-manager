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
    const accountId = searchParams.get("accountId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 })
    }

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

    const conditions = [sql`t.user_id = ${userId}`, sql`t.account_id = ${accountId}`]
    if (startDate && endDate) {
      conditions.push(sql`t.transaction_date BETWEEN ${startDate} AND ${endDate}`)
    } else if (startDate) {
      conditions.push(sql`t.transaction_date >= ${startDate}`)
    } else if (endDate) {
      conditions.push(sql`t.transaction_date <= ${endDate}`)
    }

    const whereClause = sql.join(conditions, sql` AND `)

    const transactions = await sql`
      SELECT
        t.*,
        a.name as account_name,
        c.name as category_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) as count
      FROM transactions t
      WHERE ${whereClause}
    `

    const total = Number.parseInt(count as any)

    return NextResponse.json({
      transactions,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error("Get transactions by account error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
