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

    const categories = await sql`
      SELECT * FROM categories 
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, name ASC
    `

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, type, color } = await request.json()

    const [category] = await sql`
      INSERT INTO categories (user_id, name, type, color, is_default)
      VALUES (${userId}, ${name}, ${type}, ${color}, false)
      RETURNING *
    `

    return NextResponse.json(category)
  } catch (error) {
    console.error("Create category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, name, type, color } = await request.json()

    const [category] = await sql`
      UPDATE categories 
      SET name = ${name}, type = ${type}, color = ${color}
      WHERE id = ${id} AND user_id = ${userId} AND is_default = false
      RETURNING *
    `

    return NextResponse.json(category)
  } catch (error) {
    console.error("Update category error:", error)
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
      return NextResponse.json({ error: "Category ID required" }, { status: 400 })
    }

    await sql`
      DELETE FROM categories 
      WHERE id = ${id} AND user_id = ${userId} AND is_default = false
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete category error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
