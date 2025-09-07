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
    const since = searchParams.get("since")
    const sinceTimestamp = since ? new Date(since).toISOString() : "1970-01-01T00:00:00Z"

    // Get all user data for sync
    const [accounts, transactions, categories, budgets, settings, syncChanges] = await Promise.all([
      sql`SELECT * FROM accounts WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`
        SELECT 
          t.*,
          a.name as account_name,
          c.name as category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `,
      sql`SELECT * FROM categories WHERE user_id = ${userId} ORDER BY is_default DESC, name ASC`,
      sql`
        SELECT 
          b.*,
          c.name as category_name
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ${userId}
        ORDER BY b.created_at DESC
      `,
      sql`SELECT * FROM user_settings WHERE user_id = ${userId}`,
      sql`SELECT * FROM get_sync_changes(${userId}, ${sinceTimestamp})`,
    ])

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        transactions,
        categories,
        budgets,
        settings: settings[0] || null,
      },
      syncChanges,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lastSyncTime } = await request.json()

    // Clean old sync logs
    await sql`SELECT clean_old_sync_logs()`

    // Get changes since last sync
    const changes = await sql`SELECT * FROM get_sync_changes(${userId}, ${lastSyncTime || "1970-01-01T00:00:00Z"})`

    return NextResponse.json({
      success: true,
      changes,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sync changes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
