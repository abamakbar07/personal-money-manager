"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error" | "offline">("synced")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) {
        setSyncStatus("offline")
      }
    }

    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)
    updateOnlineStatus()

    // Set up sync monitoring
    const unsubscribe = apiClient.onSync(() => {
      setSyncStatus("syncing")
      setTimeout(() => {
        setSyncStatus("synced")
        setLastSyncTime(new Date())
      }, 1000)
    })

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
      unsubscribe()
    }
  }, [])

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "synced":
        return <Check className="h-3 w-3" />
      case "syncing":
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case "error":
        return <AlertCircle className="h-3 w-3" />
      case "offline":
        return <WifiOff className="h-3 w-3" />
      default:
        return <Wifi className="h-3 w-3" />
    }
  }

  const getStatusColor = () => {
    switch (syncStatus) {
      case "synced":
        return "bg-green-100 text-green-800 border-green-200"
      case "syncing":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "offline":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = () => {
    switch (syncStatus) {
      case "synced":
        return lastSyncTime ? `Synced ${formatTime(lastSyncTime)}` : "Synced"
      case "syncing":
        return "Syncing..."
      case "error":
        return "Sync Error"
      case "offline":
        return "Offline"
      default:
        return "Unknown"
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    return date.toLocaleDateString()
  }

  return (
    <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="ml-1">{getStatusText()}</span>
    </Badge>
  )
}
