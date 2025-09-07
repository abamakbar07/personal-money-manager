import { type NextRequest, NextResponse } from "next/server"
import { createOrGetUser, verifyUser, createSession, verifySession } from "@/lib/auth"

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
    const { action, pin, sessionToken, deviceInfo } = await request.json()
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

    if (action === "authenticate") {
      try {
        // Try to authenticate with existing user or create new one
        const result = await createOrGetUser(pin)
        const sessionToken = await createSession(result.userId, deviceId, finalDeviceInfo)

        return NextResponse.json({
          success: true,
          userId: result.userId,
          sessionToken,
          isDefaultPin: result.isDefaultPin,
          isNewUser: result.isNewUser,
        })
      } catch (error) {
        // If PIN is wrong for existing user, try verification
        const result = await verifyUser(pin)
        if (result) {
          const sessionToken = await createSession(result.userId, deviceId, finalDeviceInfo)
          return NextResponse.json({
            success: true,
            userId: result.userId,
            sessionToken,
            isDefaultPin: result.isDefaultPin,
            isNewUser: false,
          })
        } else {
          return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 })
        }
      }
    }

    if (action === "change-pin") {
      const sessionToken = request.headers.get("authorization")?.replace("Bearer ", "")
      if (!sessionToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const userId = await verifySession(sessionToken, deviceId)
      if (!userId) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 })
      }

      const { changePin } = await import("@/lib/auth")
      const success = await changePin(userId, pin)

      if (success) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: "Failed to change PIN" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
