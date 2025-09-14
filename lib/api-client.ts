"use client"

interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  screenResolution: string
  timezone: string
  deviceName: string
}

class ApiClient {
  private sessionToken: string | null = null
  private deviceId: string
  private deviceInfo: DeviceInfo | null = null
  private syncInProgress = false
  private lastSyncTime = 0
  private syncCallbacks: Set<() => void> = new Set()

  constructor() {
    if (typeof window === "undefined") {
      // Running during build / on server: create no-op storage values
      this.deviceId = "server-device"
      this.sessionToken = null
      return
    }

    this.deviceId = this.getOrCreateDeviceId()
    this.sessionToken = localStorage.getItem("money-manager-session-token")
    this.deviceInfo = this.getDeviceInfo()

    // Set up periodic sync
    this.setupPeriodicSync()

    // Set up visibility change listener for sync
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.triggerSync()
      }
    })
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "server-device"

    let deviceId = localStorage.getItem("money-manager-device-id")
    if (!deviceId) {
      // Create a more robust device ID
      const fingerprint = this.generateDeviceFingerprint()
      deviceId = `device-${Date.now()}-${fingerprint}`
      localStorage.setItem("money-manager-device-id", deviceId)
    }
    return deviceId
  }

  private generateDeviceFingerprint(): string {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.textBaseline = "top"
      ctx.font = "14px Arial"
      ctx.fillText("Device fingerprint", 2, 2)
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvas.toDataURL(),
    ].join("|")

    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    return Math.abs(hash).toString(36).slice(0, 8)
  }

  private getDeviceInfo(): DeviceInfo {
    if (typeof window === "undefined") {
      return {
        userAgent: "server",
        platform: "server",
        language: "en",
        screenResolution: "0x0",
        timezone: "UTC",
        deviceName: "Server",
      }
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceName: this.getDeviceName(),
    }
  }

  private getDeviceName(): string {
    const ua = navigator.userAgent
    if (ua.includes("Mobile")) return "Mobile Device"
    if (ua.includes("Tablet")) return "Tablet"
    if (ua.includes("Windows")) return "Windows PC"
    if (ua.includes("Mac")) return "Mac"
    if (ua.includes("Linux")) return "Linux PC"
    return "Unknown Device"
  }

  private setupPeriodicSync() {
    // Sync every 30 seconds when tab is active
    setInterval(() => {
      if (!document.hidden && this.sessionToken) {
        this.triggerSync()
      }
    }, 30000)
  }

  private async triggerSync() {
    if (this.syncInProgress || Date.now() - this.lastSyncTime < 5000) {
      return // Prevent too frequent syncs
    }

    this.syncInProgress = true
    this.lastSyncTime = Date.now()

    try {
      // Trigger sync callbacks
      this.syncCallbacks.forEach((callback) => {
        try {
          callback()
        } catch (error) {
          console.error("Sync callback error:", error)
        }
      })
    } finally {
      this.syncInProgress = false
    }
  }

  public onSync(callback: () => void) {
    this.syncCallbacks.add(callback)
    return () => this.syncCallbacks.delete(callback)
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Device-ID": this.deviceId,
    }

    if (this.deviceInfo) {
      headers["X-Device-Info"] = JSON.stringify(this.deviceInfo)
    }

    if (this.sessionToken) {
      headers.Authorization = `Bearer ${this.sessionToken}`
    }

    return headers
  }

  setSessionToken(token: string) {
    this.sessionToken = token
    if (typeof window !== "undefined") {
      localStorage.setItem("money-manager-session-token", token)
    }
  }

  clearSession() {
    this.sessionToken = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("money-manager-session-token")
      localStorage.removeItem("money-manager-auth")
      localStorage.removeItem("money-manager-user-id")
      localStorage.removeItem("money-manager-device-id")
    }
  }

  async checkSession(): Promise<{ authenticated: boolean; userId?: string }> {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: "check-session",
          sessionToken: this.sessionToken,
        }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Session check error:", error)
      return { authenticated: false }
    }
  }

  async register(identifier: string, password: string): Promise<any> {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        action: "register",
        identifier,
        password,
        deviceInfo: this.deviceInfo,
      }),
    })

    const data = await response.json()

    if (data.success && data.sessionToken) {
      this.setSessionToken(data.sessionToken)
      this.triggerSync()
    }

    return data
  }

  async login(identifier: string, password: string): Promise<any> {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        action: "login",
        identifier,
        password,
        deviceInfo: this.deviceInfo,
      }),
    })

    const data = await response.json()

    if (data.success && data.sessionToken) {
      this.setSessionToken(data.sessionToken)
      this.triggerSync()
    }

    return data
  }

  async changePassword(newPassword: string): Promise<any> {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        action: "change-password",
        newPassword,
      }),
    })

    return response.json()
  }

  async getSessions(): Promise<any> {
    const response = await fetch("/api/auth/sessions", {
      method: "GET",
      headers: this.getHeaders(),
    })

    return response.json()
  }

  async revokeSession(deviceId: string): Promise<any> {
    const response = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: this.getHeaders(),
      body: JSON.stringify({ deviceId }),
    })

    return response.json()
  }

  async revokeAllSessions(): Promise<any> {
    const response = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: this.getHeaders(),
      body: JSON.stringify({ revokeAll: true }),
    })

    return response.json()
  }

  async get(endpoint: string): Promise<any> {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: this.getHeaders(),
    })

    if (response.status === 401) {
      this.clearSession()
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      return
    }

    return response.json()
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })

    if (response.status === 401) {
      this.clearSession()
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      return
    }

    const result = await response.json()

    // Trigger sync after successful data modification
    if (
      response.ok &&
      (endpoint.includes("/transactions") || endpoint.includes("/accounts") || endpoint.includes("/budgets"))
    ) {
      this.triggerSync()
    }

    return result
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })

    if (response.status === 401) {
      this.clearSession()
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      return
    }

    const result = await response.json()

    // Trigger sync after successful data modification
    if (
      response.ok &&
      (endpoint.includes("/transactions") || endpoint.includes("/accounts") || endpoint.includes("/budgets"))
    ) {
      this.triggerSync()
    }

    return result
  }

  async delete(endpoint: string): Promise<any> {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: this.getHeaders(),
    })

    if (response.status === 401) {
      this.clearSession()
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      return
    }

    const result = await response.json()

    // Trigger sync after successful data modification
    if (
      response.ok &&
      (endpoint.includes("/transactions") || endpoint.includes("/accounts") || endpoint.includes("/budgets"))
    ) {
      this.triggerSync()
    }

    return result
  }
}

export const apiClient = new ApiClient()
