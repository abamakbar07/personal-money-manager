"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Palette,
  Bell,
  Database,
  Folder,
  Target,
  Wallet,
  CheckCircle,
  AlertCircle,
  Smartphone,
} from "lucide-react"
import { CategoryManager } from "@/components/category-manager"
import { Budget } from "@/components/budget"
import { Accounts } from "@/components/accounts"
import { DeviceManagement } from "@/components/device-management"
import { SyncStatus } from "@/components/sync-status"
import { apiClient } from "@/lib/api-client"

export function Settings() {
  const [settings, setSettings] = useState({
    currency: "IDR",
    dateFormat: "DD/MM/YYYY",
    theme: "light",
    notificationsEnabled: true,
    autoBackup: true,
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const userSettings = await apiClient.get("/api/settings")
      if (userSettings) {
        setSettings({
          currency: userSettings.currency || "IDR",
          dateFormat: userSettings.date_format || "DD/MM/YYYY",
          theme: userSettings.theme || "light",
          notificationsEnabled: userSettings.notifications_enabled ?? true,
          autoBackup: userSettings.auto_backup ?? true,
        })
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)
    try {
      await apiClient.put("/api/settings", {
        currency: settings.currency,
        dateFormat: settings.dateFormat,
        theme: settings.theme,
        notificationsEnabled: settings.notificationsEnabled,
        autoBackup: settings.autoBackup,
      })
      setMessage({ type: "success", text: "Settings saved successfully!" })
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" })
    } finally {
      setIsLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" })
      return
    }

    setIsLoading(true)
    try {
      const result = await apiClient.changePassword(newPassword)
      if (result.success) {
        setMessage({ type: "success", text: "Password changed successfully!" })
        setShowPasswordForm(false)
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage({ type: "error", text: result.error || "Failed to change password" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to change password" })
    } finally {
      setIsLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-2">Settings</h1>
          <p className="text-neutral-600">Manage your account and application preferences</p>
        </div>
        <SyncStatus />
      </div>

      {/* Message Alert */}
      {message && (
        <Alert
          className={`${message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-white/80 backdrop-blur-sm rounded-2xl p-2">
          <TabsTrigger value="general" className="rounded-xl">
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl">
            Security
          </TabsTrigger>
          <TabsTrigger value="devices" className="rounded-xl">
            Devices
          </TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-xl">
            Accounts
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl">
            Categories
          </TabsTrigger>
          <TabsTrigger value="budgets" className="rounded-xl">
            Budgets
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                General Preferences
              </CardTitle>
              <CardDescription>Customize your app experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
                  >
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={settings.theme} onValueChange={(value) => setSettings({ ...settings, theme: value })}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-neutral-600" />
                    <div>
                      <Label htmlFor="notifications">Notifications</Label>
                      <p className="text-sm text-neutral-500">Receive alerts for budgets and transactions</p>
                    </div>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-neutral-600" />
                    <div>
                      <Label htmlFor="autoBackup">Auto Sync</Label>
                      <p className="text-sm text-neutral-500">Automatically sync your data across devices</p>
                    </div>
                  </div>
                  <Switch
                    id="autoBackup"
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                  />
                </div>
              </div>

              <Button
                onClick={saveSettings}
                disabled={isLoading}
                className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-8"
              >
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!showPasswordForm ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Password</h4>
                    <p className="text-blue-700 text-sm mb-4">
                      Your password protects access to your financial data across all devices.
                    </p>
                    <Button
                      onClick={() => setShowPasswordForm(true)}
                      className="gradient-blue border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="h-12 rounded-2xl"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="h-12 rounded-2xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="gradient-green border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
                    >
                      {isLoading ? "Changing..." : "Change Password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword("")
                        setConfirmPassword("")
                      }}
                      className="rounded-2xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Management */}
        <TabsContent value="devices">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Management
              </CardTitle>
              <CardDescription>Manage devices with access to your financial data</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Management */}
        <TabsContent value="accounts">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Account Management
              </CardTitle>
              <CardDescription>Manage your financial accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Accounts />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Management */}
        <TabsContent value="categories">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Category Management
              </CardTitle>
              <CardDescription>Organize your transaction categories</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Management */}
        <TabsContent value="budgets">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Budget Management
              </CardTitle>
              <CardDescription>Set and track your spending goals</CardDescription>
            </CardHeader>
            <CardContent>
              <Budget />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
