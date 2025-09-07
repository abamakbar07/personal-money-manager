import { type NextRequest, NextResponse } from "next/server"
import { verifySession, getUserSessions, revokeSession, revokeAllSessions } from "@/lib/auth"

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

    const sessions = await getUserSessions(userId)
    return NextResponse.json(sessions)
  } catch (error) {
    console.error("Get sessions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { deviceId, revokeAll } = await request.json()
    const currentDeviceId = getDeviceId(request)

    if (revokeAll) {
      const success = await revokeAllSessions(userId, currentDeviceId)
      return NextResponse.json({ success })
    } else if (deviceId) {
      const success = await revokeSession(userId, deviceId)
      return NextResponse.json({ success })
    } else {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 })
    }
  } catch (error) {
    console.error("Revoke session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
