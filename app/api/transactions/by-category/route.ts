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
    const categoryId = searchParams.get("categoryId")
    const categoryName = searchParams.get("categoryName")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let transactions, count

    if (categoryId) {
      transactions = await sql`
        SELECT 
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.category_id = ${categoryId}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const [countResult] = await sql`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE user_id = ${userId} AND category_id = ${categoryId}
      `
      count = countResult.count
    } else if (categoryName) {
      transactions = await sql`
        SELECT 
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND c.name = ${categoryName}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const [countResult] = await sql`
        SELECT COUNT(*) as count 
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND c.name = ${categoryName}
      `
      count = countResult.count
    } else {
      return NextResponse.json({ error: "Category ID or name required" }, { status: 400 })
    }

    return NextResponse.json({
      transactions,
      total: Number.parseInt(count),
      hasMore: offset + limit < Number.parseInt(count),
    })
  } catch (error) {
    console.error("Get transactions by category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
