"use client"

import { useState, useEffect } from "react"
import { BasicAuth } from "@/components/basic-auth"
import { Dashboard } from "@/components/dashboard"
import { apiClient } from "@/lib/api-client"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      const result = await apiClient.checkSession()
      if (result.authenticated) {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Auth check error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
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
    return <BasicAuth onAuthenticated={handleAuthenticated} />
  }

  return <Dashboard onLogout={handleLogout} />
}
