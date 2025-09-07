import { sql } from "./database"
import bcrypt from "bcryptjs"

const DEFAULT_PIN = "2369"

// Generate a simple UUID without external dependency
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Generate a unique user identifier based on browser fingerprint
function generateUserFingerprint(): string {
  if (typeof window === "undefined") return "server-fingerprint"

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  ctx!.textBaseline = "top"
  ctx!.font = "14px Arial"
  ctx!.fillText("User fingerprint", 2, 2)

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|")

  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

export async function createOrGetUser(
  pin?: string,
): Promise<{ userId: string; isDefaultPin: boolean; isNewUser: boolean }> {
  const actualPin = pin || DEFAULT_PIN
  const isDefaultPin = !pin || pin === DEFAULT_PIN

  // First, try to find existing user
  const users = await sql`SELECT id, pin_hash, is_default_pin FROM users ORDER BY created_at DESC LIMIT 1`

  if (users.length > 0) {
    // User exists, verify PIN
    const user = users[0]
    const isValid = await bcrypt.compare(actualPin, user.pin_hash)
    if (isValid) {
      return { userId: user.id, isDefaultPin: user.is_default_pin, isNewUser: false }
    } else {
      throw new Error("Invalid PIN")
    }
  }

  // No user exists, create new one
  const pinHash = await bcrypt.hash(actualPin, 10)

  const [user] = await sql`
    INSERT INTO users (pin_hash, is_default_pin)
    VALUES (${pinHash}, ${isDefaultPin})
    RETURNING id
  `

  // Create default user settings
  await sql`
    INSERT INTO user_settings (user_id)
    VALUES (${user.id})
  `

  // Create default categories for the new user
  await sql`
    INSERT INTO categories (user_id, name, type, color, is_default) VALUES
    (${user.id}, 'Food & Dining', 'expense', 'red', true),
    (${user.id}, 'Transportation', 'expense', 'blue', true),
    (${user.id}, 'Shopping', 'expense', 'purple', true),
    (${user.id}, 'Entertainment', 'expense', 'pink', true),
    (${user.id}, 'Bills & Utilities', 'expense', 'yellow', true),
    (${user.id}, 'Healthcare', 'expense', 'green', true),
    (${user.id}, 'Education', 'expense', 'indigo', true),
    (${user.id}, 'Travel', 'expense', 'teal', true),
    (${user.id}, 'Transfer', 'expense', 'gray', true),
    (${user.id}, 'Other', 'expense', 'gray', true),
    (${user.id}, 'Salary', 'income', 'green', true),
    (${user.id}, 'Freelance', 'income', 'blue', true),
    (${user.id}, 'Investment', 'income', 'purple', true),
    (${user.id}, 'Gift', 'income', 'pink', true),
    (${user.id}, 'Bonus', 'income', 'yellow', true),
    (${user.id}, 'Transfer', 'income', 'gray', true),
    (${user.id}, 'Other', 'income', 'gray', true)
  `

  return { userId: user.id, isDefaultPin, isNewUser: true }
}

export async function verifyUser(pin: string): Promise<{ userId: string; isDefaultPin: boolean } | null> {
  const users = await sql`
    SELECT id, pin_hash, is_default_pin FROM users ORDER BY created_at DESC
  `

  for (const user of users) {
    const isValid = await bcrypt.compare(pin, user.pin_hash)
    if (isValid) {
      return { userId: user.id, isDefaultPin: user.is_default_pin }
    }
  }

  return null
}

export async function createSession(userId: string, deviceId: string, deviceInfo?: any): Promise<string> {
  const sessionToken = generateUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  await sql`
    INSERT INTO user_sessions (user_id, device_id, session_token, expires_at, device_info)
    VALUES (${userId}, ${deviceId}, ${sessionToken}, ${expiresAt}, ${JSON.stringify(deviceInfo || {})})
    ON CONFLICT (user_id, device_id) 
    DO UPDATE SET 
      session_token = ${sessionToken},
      expires_at = ${expiresAt},
      last_accessed = NOW(),
      device_info = ${JSON.stringify(deviceInfo || {})}
  `

  return sessionToken
}

export async function verifySession(sessionToken: string, deviceId: string): Promise<string | null> {
  const [session] = await sql`
    SELECT user_id FROM user_sessions 
    WHERE session_token = ${sessionToken} 
    AND device_id = ${deviceId}
    AND expires_at > NOW()
  `

  if (session) {
    // Update last accessed
    await sql`
      UPDATE user_sessions 
      SET last_accessed = NOW()
      WHERE session_token = ${sessionToken} AND device_id = ${deviceId}
    `
    return session.user_id
  }

  return null
}

export async function getUserSessions(userId: string) {
  const sessions = await sql`
    SELECT device_id, device_info, last_accessed, created_at
    FROM user_sessions 
    WHERE user_id = ${userId} AND expires_at > NOW()
    ORDER BY last_accessed DESC
  `
  return sessions
}

export async function revokeSession(userId: string, deviceId: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM user_sessions 
      WHERE user_id = ${userId} AND device_id = ${deviceId}
    `
    return true
  } catch (error) {
    console.error("Error revoking session:", error)
    return false
  }
}

export async function revokeAllSessions(userId: string, exceptDeviceId?: string): Promise<boolean> {
  try {
    if (exceptDeviceId) {
      await sql`
        DELETE FROM user_sessions 
        WHERE user_id = ${userId} AND device_id != ${exceptDeviceId}
      `
    } else {
      await sql`
        DELETE FROM user_sessions 
        WHERE user_id = ${userId}
      `
    }
    return true
  } catch (error) {
    console.error("Error revoking sessions:", error)
    return false
  }
}

export async function changePin(userId: string, newPin: string): Promise<boolean> {
  try {
    const pinHash = await bcrypt.hash(newPin, 10)
    await sql`
      UPDATE users 
      SET pin_hash = ${pinHash}, is_default_pin = false
      WHERE id = ${userId}
    `
    return true
  } catch (error) {
    console.error("Error changing PIN:", error)
    return false
  }
}

export async function getUserSettings(userId: string) {
  const [settings] = await sql`
    SELECT * FROM user_settings WHERE user_id = ${userId}
  `
  return settings
}

export async function updateUserSettings(userId: string, settings: any) {
  await sql`
    UPDATE user_settings 
    SET currency = ${settings.currency || "IDR"},
        date_format = ${settings.dateFormat || "DD/MM/YYYY"},
        theme = ${settings.theme || "light"},
        notifications_enabled = ${settings.notificationsEnabled || true},
        auto_backup = ${settings.autoBackup || true}
    WHERE user_id = ${userId}
  `
}

export async function cleanExpiredSessions(): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`
}

/**
 * Deprecated - kept only so older route-handlers compile.
 * All new code should use verifySession() + device headers helpers instead.
 */
export async function getUserId(): Promise<string | null> {
  return null
}

// Export the fingerprint function for client use
export { generateUserFingerprint }
