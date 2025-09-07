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

    const budgets = await sql`
      SELECT 
        b.*,
        c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ${userId}
      ORDER BY b.created_at DESC
    `

    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Get budgets error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { category, amount, period, startDate, endDate } = await request.json()

    // Get category ID
    const [categoryRecord] = await sql`
      SELECT id FROM categories 
      WHERE name = ${category} AND user_id = ${userId}
    `

    if (!categoryRecord) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const [budget] = await sql`
      INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date)
      VALUES (${userId}, ${categoryRecord.id}, ${amount}, ${period}, ${startDate}, ${endDate})
      RETURNING *
    `

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Create budget error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, category, amount, period, startDate, endDate } = await request.json()

    // Get category ID
    const [categoryRecord] = await sql`
      SELECT id FROM categories 
      WHERE name = ${category} AND user_id = ${userId}
    `

    if (!categoryRecord) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const [budget] = await sql`
      UPDATE budgets 
      SET category_id = ${categoryRecord.id}, amount = ${amount}, period = ${period}, 
          start_date = ${startDate}, end_date = ${endDate}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Update budget error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
      return NextResponse.json({ error: "Budget ID required" }, { status: 400 })
    }

    await sql`
      DELETE FROM budgets 
      WHERE id = ${id} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete budget error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
