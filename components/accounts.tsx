"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Edit,
  Trash2,
  Wallet,
  CreditCard,
  PiggyBank,
  Landmark,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color: string
  created_at: string
}

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "checking",
    balance: "",
    color: "blue",
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    // Clear messages after 5 seconds
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const loadAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiClient.get("/api/accounts")
      setAccounts(data || [])
    } catch (error) {
      console.error("Error loading accounts:", error)
      setError("Failed to load accounts. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Please enter an account name")
      return false
    }

    if (!formData.type) {
      setError("Please select an account type")
      return false
    }

    if (!formData.balance || Number.parseFloat(formData.balance) < 0) {
      setError("Please enter a valid balance (0 or greater)")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      const accountData = {
        name: formData.name.trim(),
        type: formData.type,
        balance: Number.parseFloat(formData.balance),
        color: formData.color,
      }

      let result
      if (editingAccount) {
        result = await apiClient.put("/api/accounts", {
          id: editingAccount.id,
          ...accountData,
        })
      } else {
        result = await apiClient.post("/api/accounts", accountData)

        // For new accounts with initial balance > 0, create an initial transaction
        if (accountData.balance > 0) {
          try {
            await apiClient.post("/api/transactions", {
              type: "income",
              amount: accountData.balance,
              description: `Initial balance for ${accountData.name}`,
              category: "Other", // Default category for initial balance
              account: result.id, // Use the newly created account ID
              date: new Date().toISOString().split("T")[0],
            })
          } catch (transactionError) {
            console.error("Error creating initial transaction:", transactionError)
            // Don't fail the account creation if transaction fails
          }
        }
      }

      if (result && !result.error) {
        setSuccess(editingAccount ? "Account updated successfully!" : "Account created successfully!")

        // Reload accounts
        await loadAccounts()

        // Reset form and close dialog
        handleDialogClose()
      } else {
        throw new Error(result?.error || "Failed to save account")
      }
    } catch (error) {
      console.error("Error saving account:", error)
      setError(error.message || `Failed to ${editingAccount ? "update" : "create"} account. Please try again.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      color: account.color,
    })
    setIsDialogOpen(true)
    setError(null)
    setSuccess(null)
  }

  const handleDelete = async (accountId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this account? All associated transactions will also be deleted. This action cannot be undone.",
      )
    ) {
      return
    }

    setIsDeleting(accountId)
    setError(null)
    setSuccess(null)

    try {
      const result = await apiClient.delete(`/api/accounts?id=${accountId}`)

      if (result && !result.error) {
        setSuccess("Account deleted successfully!")
        await loadAccounts()
      } else {
        throw new Error(result?.error || "Failed to delete account")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      setError(error.message || "Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingAccount(null)
    setFormData({ name: "", type: "checking", balance: "", color: "blue" })
    setError(null)
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <Landmark className="h-6 w-6" />
      case "savings":
        return <PiggyBank className="h-6 w-6" />
      case "credit":
        return <CreditCard className="h-6 w-6" />
      default:
        return <Wallet className="h-6 w-6" />
    }
  }

  const getGradientClass = (color: string) => {
    const gradients = {
      blue: "gradient-blue",
      green: "gradient-green",
      red: "gradient-pink",
      purple: "gradient-purple",
      yellow: "gradient-yellow",
      pink: "gradient-pink",
    }
    return gradients[color] || gradients.blue
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-neutral-600">Loading accounts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-2">Your Accounts</h1>
          <p className="text-neutral-600">
            Total Balance:{" "}
            <span className="font-bold text-2xl gradient-purple bg-clip-text text-transparent">
              Rp {totalBalance.toLocaleString("id-ID")}
            </span>
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gradient-blue border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-md border-0 shadow-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-neutral-800">
                {editingAccount ? "Edit Account" : "Add New Account"}
              </DialogTitle>
              <DialogDescription className="text-neutral-600">
                {editingAccount ? "Update your account details" : "Create a new account to track your finances"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-6">
                <div className="grid gap-3">
                  <Label htmlFor="name" className="text-neutral-700 font-medium">
                    Account Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Checking"
                    className="h-12 rounded-2xl border-neutral-200 focus:border-blue-400"
                    disabled={isSaving}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="type" className="text-neutral-700 font-medium">
                    Account Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="balance" className="text-neutral-700 font-medium">
                    {editingAccount ? "Current Balance" : "Initial Balance"}
                  </Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                    className="h-12 rounded-2xl border-neutral-200 focus:border-blue-400"
                    disabled={isSaving}
                    required
                  />
                  {!editingAccount && (
                    <p className="text-sm text-neutral-500">
                      If you enter an initial balance greater than 0, an initial transaction will be created
                      automatically.
                    </p>
                  )}
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="color" className="text-neutral-700 font-medium">
                    Color Theme
                  </Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  disabled={isSaving}
                  className="rounded-2xl bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-8"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingAccount ? "Updating..." : "Creating..."}
                    </>
                  ) : editingAccount ? (
                    "Update Account"
                  ) : (
                    "Add Account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {error && !isDialogOpen && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Accounts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account, index) => (
          <Card
            key={account.id}
            className={`${getGradientClass(account.color)} border-0 text-white shadow-xl hover:scale-105 transition-all duration-300 animate-slide-in-up`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-white/20 rounded-2xl">{getAccountIcon(account.type)}</div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(account)}
                    disabled={isSaving || isDeleting === account.id}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    disabled={isSaving || isDeleting === account.id}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    {isDeleting === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{account.name}</h3>
                <p className="text-white/80 text-sm capitalize">{account.type}</p>
                <p className="text-3xl font-bold mt-4">Rp {account.balance.toLocaleString("id-ID")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && !isLoading && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl gradient-blue flex items-center justify-center">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-3">No accounts yet</h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              Add your first account to start tracking your finances and take control of your money
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-8"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
