"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Eye, EyeOff, Sparkles, Info, Smartphone, Monitor, Tablet } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface PinAuthProps {
  onAuthenticated: (isDefaultPin: boolean, isNewUser: boolean) => void
}

export function PinAuth({ onAuthenticated }: PinAuthProps) {
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  useEffect(() => {
    checkExistingSession()
    setDeviceInfo(getDeviceInfo())
  }, [])

  const getDeviceInfo = () => {
    if (typeof window === "undefined") return null

    const ua = navigator.userAgent
    let deviceType = "desktop"
    let deviceIcon = Monitor

    if (ua.includes("Mobile")) {
      deviceType = "mobile"
      deviceIcon = Smartphone
    } else if (ua.includes("Tablet")) {
      deviceType = "tablet"
      deviceIcon = Tablet
    }

    return {
      type: deviceType,
      icon: deviceIcon,
      name: getDeviceName(),
      browser: getBrowserName(),
    }
  }

  const getDeviceName = () => {
    const ua = navigator.userAgent
    if (ua.includes("Windows")) return "Windows Device"
    if (ua.includes("Mac")) return "Mac Device"
    if (ua.includes("Linux")) return "Linux Device"
    if (ua.includes("Android")) return "Android Device"
    if (ua.includes("iPhone")) return "iPhone"
    if (ua.includes("iPad")) return "iPad"
    return "Unknown Device"
  }

  const getBrowserName = () => {
    const ua = navigator.userAgent
    if (ua.includes("Chrome")) return "Chrome"
    if (ua.includes("Firefox")) return "Firefox"
    if (ua.includes("Safari")) return "Safari"
    if (ua.includes("Edge")) return "Edge"
    return "Unknown Browser"
  }

  const checkExistingSession = async () => {
    setIsLoading(true)
    try {
      const result = await apiClient.checkSession()
      if (result.authenticated) {
        onAuthenticated(false, false) // Assume not default PIN and not new user if session exists
      }
    } catch (error) {
      console.error("Session check error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const actualPin = pin || "2369"

      if (pin && pin.length < 4) {
        setError("PIN must be at least 4 digits")
        setIsLoading(false)
        return
      }

      const result = await apiClient.authenticate(actualPin)

      if (result.success) {
        localStorage.setItem("money-manager-auth", "true")
        localStorage.setItem("money-manager-user-id", result.userId)

        if (result.isNewUser) {
          setShowWelcome(true)
          setTimeout(() => {
            onAuthenticated(result.isDefaultPin, result.isNewUser)
          }, 2000)
        } else {
          onAuthenticated(result.isDefaultPin, result.isNewUser)
        }
      } else {
        setError(result.error || "Authentication failed")
        setPin("")
      }
    } catch (error) {
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const useDefaultPin = () => {
    setPin("2369")
  }

  if (isLoading && !pin) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-purple">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to your data...</p>
        </div>
      </div>
    )
  }

  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-purple">
        <Card className="w-full max-w-md glass border-0 shadow-2xl animate-scale-in">
          <CardContent className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-green">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Welcome!</h2>
            <p className="text-white/80 text-lg mb-6">
              Your personal money manager is ready. All your data will be synchronized across all your devices.
            </p>
            <div className="animate-pulse">
              <div className="h-2 bg-white/20 rounded-full mb-2">
                <div
                  className="h-2 bg-white rounded-full animate-[width_2s_ease-in-out]"
                  style={{ width: "100%" }}
                ></div>
              </div>
              <p className="text-white/60 text-sm">Setting up your account...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-purple">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md glass border-0 shadow-2xl animate-scale-in">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-blue">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2">Money Manager</CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Enter your PIN to access your financial data across all devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Info */}
          {deviceInfo && (
            <div className="flex items-center justify-center space-x-3 p-3 rounded-2xl bg-white/10">
              <deviceInfo.icon className="h-5 w-5 text-white/70" />
              <div className="text-center">
                <p className="text-white/90 text-sm font-medium">{deviceInfo.name}</p>
                <p className="text-white/60 text-xs">{deviceInfo.browser}</p>
              </div>
            </div>
          )}

          <Alert className="bg-blue-500/20 border-blue-400/30">
            <Info className="h-4 w-4 text-blue-200" />
            <AlertDescription className="text-blue-100">
              Your data is automatically synchronized across all your devices. Use PIN 2369 for quick access, or create
              your own secure PIN.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="pin" className="text-white font-medium">
                PIN
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN or leave empty for default (2369)"
                  className="pr-12 h-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 focus:border-white/50"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 px-3 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={useDefaultPin}
              className="w-full h-10 bg-white/10 border-white/30 text-white hover:bg-white/20"
              disabled={isLoading}
            >
              Use Default PIN (2369)
            </Button>

            {error && (
              <div className="text-sm text-red-200 bg-red-500/20 p-3 rounded-xl border border-red-400/30">{error}</div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-white text-purple-600 hover:bg-white/90 font-semibold text-lg rounded-xl shadow-lg disabled:opacity-50"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {isLoading ? "Connecting..." : "Access My Data"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/60 text-xs">Secure • Synchronized • Personal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
