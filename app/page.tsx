"use client"

import { useState, useEffect } from "react"
import { PinAuth } from "@/components/pin-auth"
import { Dashboard } from "@/components/dashboard"
import { apiClient } from "@/lib/api-client"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDefaultPin, setIsDefaultPin] = useState(false)

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const result = await apiClient.checkSession()
      if (result.authenticated) {
        setIsAuthenticated(true)
        // We don't know if it's default PIN from session, so assume false
        setIsDefaultPin(false)
      }
    } catch (error) {
      console.error("Auth check error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticated = (defaultPin: boolean, isNewUser: boolean) => {
    setIsAuthenticated(true)
    setIsDefaultPin(defaultPin)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setIsDefaultPin(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-purple">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your financial data...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PinAuth onAuthenticated={handleAuthenticated} />
  }

  return <Dashboard onLogout={handleLogout} isDefaultPin={isDefaultPin} />
}
