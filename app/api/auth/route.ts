import { type NextRequest, NextResponse } from "next/server"
import { registerUser, authenticateUser, createSession, verifySession, changePassword } from "@/lib/auth"

function getDeviceId(request: NextRequest): string {
  return request.headers.get("x-device-id") || request.headers.get("user-agent") || "unknown-device"
}

function getDeviceInfo(request: NextRequest): any {
  const deviceInfoHeader = request.headers.get("x-device-info")
  if (deviceInfoHeader) {
    try {
      return JSON.parse(deviceInfoHeader)
    } catch (error) {
      console.error("Error parsing device info:", error)
    }
  }
  return {
    userAgent: request.headers.get("user-agent") || "unknown",
    deviceId: getDeviceId(request),
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, identifier, password, newPassword, sessionToken, deviceInfo } = await request.json()
    const deviceId = getDeviceId(request)
    const deviceInfoFromHeader = getDeviceInfo(request)
    const finalDeviceInfo = deviceInfo || deviceInfoFromHeader

    if (action === "check-session") {
      if (sessionToken) {
        const userId = await verifySession(sessionToken, deviceId)
        if (userId) {
          return NextResponse.json({ success: true, userId, authenticated: true })
        }
      }
      return NextResponse.json({ success: true, authenticated: false })
    }

    if (action === "register") {
      try {
        const userId = await registerUser(identifier, password)
        const sessionToken = await createSession(userId, deviceId, finalDeviceInfo)
        return NextResponse.json({ success: true, userId, sessionToken })
      } catch (error) {
        return NextResponse.json({ success: false, error: "Registration failed" }, { status: 400 })
      }
    }

    if (action === "login") {
      const userId = await authenticateUser(identifier, password)
      if (userId) {
        const sessionToken = await createSession(userId, deviceId, finalDeviceInfo)
        return NextResponse.json({ success: true, userId, sessionToken })
      }
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    if (action === "change-password") {
      const token = request.headers.get("authorization")?.replace("Bearer ", "")
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const userId = await verifySession(token, deviceId)
      if (!userId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 })
      }

      const success = await changePassword(userId, newPassword || password)
      if (success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: "Failed to change password" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
