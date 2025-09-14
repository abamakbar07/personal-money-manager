"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowRightLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Account {
  id: string
  name: string
  balance: number
}

interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number
  description: string
  category_name: string
  account_name: string
  transaction_date: string
}

export function Transfer() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransferring, setIsTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [transferData, setTransferData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    loadData()
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

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [accountsData, transactionsData] = await Promise.all([
        apiClient.get("/api/accounts"),
        apiClient.get("/api/transactions?limit=100&offset=0"),
      ])

      setAccounts(accountsData || [])
      setTransactions(transactionsData?.transactions || transactionsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load account data. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  const validateTransfer = () => {
    if (!transferData.fromAccount) {
      setError("Please select a source account")
      return false
    }

    if (!transferData.toAccount) {
      setError("Please select a destination account")
      return false
    }

    if (transferData.fromAccount === transferData.toAccount) {
      setError("Cannot transfer to the same account")
      return false
    }

    const amount = Number.parseFloat(transferData.amount)
    if (!transferData.amount || amount <= 0) {
      setError("Please enter a valid transfer amount greater than 0")
      return false
    }

    const fromAccount = accounts.find((acc) => acc.id === transferData.fromAccount)
    if (!fromAccount) {
      setError("Source account not found")
      return false
    }

    if (fromAccount.balance < amount) {
      setError("Insufficient funds in source account")
      return false
    }

    if (!transferData.date) {
      setError("Please select a date")
      return false
    }

    return true
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateTransfer()) {
      return
    }

    setIsTransferring(true)

    try {
      const amount = Number.parseFloat(transferData.amount)
      const fromAccount = accounts.find((acc) => acc.id === transferData.fromAccount)
      const toAccount = accounts.find((acc) => acc.id === transferData.toAccount)

      if (!fromAccount || !toAccount) {
        throw new Error("Account not found")
      }

      // Create two transactions: one expense from source, one income to destination
      const transferDescription = transferData.description
        ? transferData.description.trim()
        : `Transfer between accounts`

      const expenseTransaction = {
        type: "expense",
        amount: amount,
        description: `Transfer to ${toAccount.name}${transferDescription ? ` - ${transferDescription}` : ""}`,
        category: "Transfer",
        account: transferData.fromAccount,
        date: transferData.date,
      }

      const incomeTransaction = {
        type: "income",
        amount: amount,
        description: `Transfer from ${fromAccount.name}${transferDescription ? ` - ${transferDescription}` : ""}`,
        category: "Transfer",
        account: transferData.toAccount,
        date: transferData.date,
      }

      // Execute both transactions
      await Promise.all([
        apiClient.post("/api/transactions", expenseTransaction),
        apiClient.post("/api/transactions", incomeTransaction),
      ])

      setSuccess(
        `Successfully transferred Rp ${amount.toLocaleString("id-ID")} from ${fromAccount.name} to ${toAccount.name}`,
      )

      // Reload data to get updated balances
      await loadData()

      // Reset form
      setTransferData({
        fromAccount: "",
        toAccount: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      })
    } catch (error) {
      console.error("Transfer error:", error)
      setError(error.message || "Transfer failed. Please try again.")
    } finally {
      setIsTransferring(false)
    }
  }

  const getAccountBalance = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId)
    return account?.balance || 0
  }

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId)
    return account?.name || ""
  }

  const recentTransfers = transactions
    .filter((t) => t.category_name === "Transfer")
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 10)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-neutral-600">Loading transfer data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Account Transfer</h2>
        <p className="text-muted-foreground">Transfer money between your accounts</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              New Transfer
            </CardTitle>
            <CardDescription>Move money between your accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="fromAccount">From Account</Label>
                <Select
                  value={transferData.fromAccount}
                  onValueChange={(value) => setTransferData({ ...transferData, fromAccount: value })}
                  disabled={isTransferring}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (Rp {account.balance.toLocaleString("id-ID")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferData.fromAccount && (
                  <p className="text-sm text-muted-foreground">
                    Available: Rp {getAccountBalance(transferData.fromAccount).toLocaleString("id-ID")}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="toAccount">To Account</Label>
                <Select
                  value={transferData.toAccount}
                  onValueChange={(value) => setTransferData({ ...transferData, toAccount: value })}
                  disabled={isTransferring}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((acc) => acc.id !== transferData.fromAccount)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} (Rp {account.balance.toLocaleString("id-ID")})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  placeholder="0.00"
                  disabled={isTransferring}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  placeholder="Add a note for this transfer"
                  rows={2}
                  disabled={isTransferring}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={transferData.date}
                  onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                  disabled={isTransferring}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isTransferring || accounts.length < 2}>
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Transfer...
                  </>
                ) : (
                  "Transfer Money"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transfers</CardTitle>
            <CardDescription>Your latest account transfers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransfers.map((transfer, index) => (
                <div key={transfer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-full ${transfer.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transfer.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.account_name} • {new Date(transfer.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${transfer.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {transfer.type === "income" ? "+" : "-"}Rp {transfer.amount.toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
              {recentTransfers.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No transfers yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {accounts.length < 2 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Need More Accounts</p>
              <p className="text-sm text-yellow-700">
                You need at least 2 accounts to make transfers. Add more accounts in the Accounts tab.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
