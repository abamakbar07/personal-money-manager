"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Monitor, Tablet, Trash2, Shield, Wifi, Clock } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface DeviceSession {
  device_id: string
  device_info: any
  last_accessed: string
  created_at: string
}

export function DeviceManagement() {
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const result = await apiClient.getSessions()
      setSessions(result || [])
    } catch (error) {
      console.error("Error loading sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (deviceId: string) => {
    setRevoking(deviceId)
    try {
      await apiClient.revokeSession(deviceId)
      await loadSessions()
    } catch (error) {
      console.error("Error revoking session:", error)
    } finally {
      setRevoking(null)
    }
  }

  const revokeAllSessions = async () => {
    setRevoking("all")
    try {
      await apiClient.revokeAllSessions()
      await loadSessions()
    } catch (error) {
      console.error("Error revoking all sessions:", error)
    } finally {
      setRevoking(null)
    }
  }

  const getDeviceIcon = (deviceInfo: any) => {
    if (!deviceInfo) return Monitor

    const userAgent = deviceInfo.userAgent || ""
    if (userAgent.includes("Mobile")) return Smartphone
    if (userAgent.includes("Tablet")) return Tablet
    return Monitor
  }

  const getDeviceName = (deviceInfo: any) => {
    if (!deviceInfo) return "Unknown Device"
    return deviceInfo.deviceName || "Unknown Device"
  }

  const getBrowserName = (deviceInfo: any) => {
    if (!deviceInfo) return "Unknown Browser"

    const userAgent = deviceInfo.userAgent || ""
    if (userAgent.includes("Chrome")) return "Chrome"
    if (userAgent.includes("Firefox")) return "Firefox"
    if (userAgent.includes("Safari")) return "Safari"
    if (userAgent.includes("Edge")) return "Edge"
    return "Unknown Browser"
  }

  const formatLastAccessed = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Active now"
    if (minutes < 60) return `${minutes} minutes ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} days ago`

    return date.toLocaleDateString()
  }

  const isCurrentDevice = (deviceId: string) => {
    if (typeof window === "undefined") return false
    const currentDeviceId = localStorage.getItem("money-manager-device-id")
    return deviceId === currentDeviceId
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Connected Devices</h3>
          <p className="text-sm text-muted-foreground">Manage devices that have access to your financial data</p>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={revokeAllSessions}
            disabled={revoking === "all"}
            className="text-red-600 hover:text-red-700 bg-transparent"
          >
            {revoking === "all" ? "Revoking..." : "Revoke All"}
          </Button>
        )}
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Your data is automatically synchronized across all connected devices. You can revoke access for any device at
          any time.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {sessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.device_info)
          const isActive = isCurrentDevice(session.device_id)

          return (
            <Card key={session.device_id} className={`${isActive ? "ring-2 ring-blue-500 bg-blue-50/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-2xl ${isActive ? "gradient-blue" : "bg-gray-100"}`}>
                      <DeviceIcon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{getDeviceName(session.device_info)}</h4>
                        {isActive && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                            This Device
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{getBrowserName(session.device_info)}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatLastAccessed(session.last_accessed)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Wifi className="h-3 w-3" />
                          <span>Connected {new Date(session.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(session.device_id)}
                      disabled={revoking === session.device_id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {revoking === session.device_id ? (
                        "Revoking..."
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {sessions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
            <p className="text-muted-foreground">No devices are currently connected to your account.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
