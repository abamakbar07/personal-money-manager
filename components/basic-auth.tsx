"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiClient } from "@/lib/api-client"

interface BasicAuthProps {
  onAuthenticated: () => void
}

export function BasicAuth({ onAuthenticated }: BasicAuthProps) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    setIsLoading(true)
    try {
      const result = await apiClient.checkSession()
      if (result.authenticated) {
        onAuthenticated()
      }
    } catch (err) {
      console.error("Session check error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = isLogin
        ? await apiClient.login(identifier, password)
        : await apiClient.register(identifier, password)

      if (result.success) {
        localStorage.setItem("money-manager-auth", "true")
        localStorage.setItem("money-manager-user-id", result.userId)
        onAuthenticated()
      } else {
        setError(result.error || "Authentication failed")
      }
    } catch (err) {
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-purple">
      <Card className="w-full max-w-md glass border-0 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            {isLogin ? "Sign In" : "Register"}
          </CardTitle>
          <CardDescription className="text-white/80">
            {isLogin ? "Access your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-white">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert className="bg-red-500/20 border-red-400/30">
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Register"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-white/80"
            >
              {isLogin ? "Need an account? Register" : "Have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
