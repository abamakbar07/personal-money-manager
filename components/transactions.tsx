"use client"

import { DialogTrigger } from "@/components/ui/dialog"

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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { transactionSchema } from "@/lib/validation/transaction"

interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number
  description: string
  category_name: string
  account_name: string
  transaction_date: string
  created_at: string
  account_id: string
  category_id: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

interface Category {
  id: string
  name: string
  type: "income" | "expense"
}

interface TransactionsProps {
  openAddDialog?: boolean
  onDialogOpenChange?: (open: boolean) => void
}

const getInitialFormState = () => ({
  type: "expense" as const,
  amount: "",
  description: "",
  category: "",
  account: "",
  date: new Date().toISOString().split("T")[0],
})

export function Transactions({ openAddDialog = false, onDialogOpenChange }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const pageSize = 20
  const [formData, setFormData] = useState(getInitialFormState)

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

  const loadTransactions = async (page: number) => {
    if (page > 1) {
      setIsLoadingMore(true)
    }
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      })
      const response = await apiClient.get(`/api/transactions?${params}`)
      if (response) {
        setTransactions((prev) =>
          page === 1 ? response.transactions || [] : [...prev, ...(response.transactions || [])],
        )
        setHasMore(response.hasMore || false)
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      setError("Failed to load transaction data. Please refresh the page.")
    } finally {
      if (page > 1) {
        setIsLoadingMore(false)
      }
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [accountsData, categoriesData] = await Promise.all([
        apiClient.get("/api/accounts"),
        apiClient.get("/api/categories"),
      ])

      setAccounts(accountsData || [])
      setCategories(categoriesData || [])
      setCurrentPage(1)
      await loadTransactions(1)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to load transaction data. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!openAddDialog || isDialogOpen || isLoading) {
      return
    }

    if (accounts.length === 0 || categories.length === 0) {
      setError(
        "You need at least one account and available categories before adding a transaction.",
      )
      onDialogOpenChange?.(false)
      return
    }

    setEditingTransaction(null)
    setFormData(getInitialFormState())
    setError(null)
    setSuccess(null)
    setIsDialogOpen(true)
    onDialogOpenChange?.(true)
  }, [openAddDialog, isDialogOpen, isLoading, accounts.length, categories.length, onDialogOpenChange])

  const getCategoriesByType = (type: "income" | "expense") => {
    return categories.filter((cat) => cat.type === type)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const parsed = transactionSchema.safeParse(formData)
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(", "))
      return
    }

    const transactionData = parsed.data

    setIsSaving(true)

    try {
      let result
      if (editingTransaction) {
        result = await apiClient.put("/api/transactions", {
          id: editingTransaction.id,
          ...transactionData,
        })
      } else {
        result = await apiClient.post("/api/transactions", transactionData)
      }

      if (result && !result.error) {
        setSuccess(editingTransaction ? "Transaction updated successfully!" : "Transaction added successfully!")

        // Reload data to get updated balances and transactions
        await loadData()

        // Reset form and close dialog
        setIsDialogOpen(false)
        setEditingTransaction(null)
        setFormData(getInitialFormState())
        onDialogOpenChange?.(false)
      } else {
        throw new Error(result?.error || "Failed to save transaction")
      }
    } catch (error) {
      console.error("Error saving transaction:", error)
      setError(error.message || `Failed to ${editingTransaction ? "update" : "add"} transaction. Please try again.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category_name,
      account: transaction.account_id,
      date: transaction.transaction_date,
    })
    setIsDialogOpen(true)
    onDialogOpenChange?.(true)
    setError(null)
    setSuccess(null)
  }

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      return
    }

    setIsDeleting(transactionId)
    setError(null)
    setSuccess(null)

    try {
      const result = await apiClient.delete(`/api/transactions?id=${transactionId}`)

      if (result && !result.error) {
        setSuccess("Transaction deleted successfully!")
        // Reload data to get updated balances and transactions
        await loadData()
      } else {
        throw new Error(result?.error || "Failed to delete transaction")
      }
    } catch (error) {
      console.error("Error deleting transaction:", error)
      setError(error.message || "Failed to delete transaction. Please try again.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingTransaction(null)
    setFormData(getInitialFormState())
    setError(null)
    onDialogOpenChange?.(false)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      if (accounts.length === 0 || categories.length === 0) {
        setError(
          "You need at least one account and available categories before adding a transaction.",
        )
        onDialogOpenChange?.(false)
        return
      }
      if (!editingTransaction) {
        setFormData(getInitialFormState())
      }
      setError(null)
      setSuccess(null)
      setIsDialogOpen(true)
      onDialogOpenChange?.(true)
    } else {
      handleDialogClose()
    }
  }

  const filteredTransactions = transactions
    .filter((transaction) => {
      const categoryMatch = filterCategory === "all" || transaction.category_name === filterCategory
      const typeMatch = filterType === "all" || transaction.type === filterType
      return categoryMatch && typeMatch
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  const allCategories = [
    ...new Set([
      ...categories.filter((cat) => cat.type === "expense").map((cat) => cat.name),
      ...categories.filter((cat) => cat.type === "income").map((cat) => cat.name),
    ]),
  ]

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-neutral-600">Loading transactions...</p>
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
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-2">Transactions</h1>
          <p className="text-neutral-600">Track every rupiah in and out</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button
              className="gradient-green border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-6"
              disabled={accounts.length === 0 || categories.length === 0}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 backdrop-blur-md border-0 shadow-2xl rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-neutral-800">
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </DialogTitle>
              <DialogDescription className="text-neutral-600">
                {editingTransaction ? "Update transaction details" : "Record a new income or expense"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-6">
                <div className="grid gap-3">
                  <Label htmlFor="type" className="text-neutral-700 font-medium">
                    Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="amount" className="text-neutral-700 font-medium">
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="h-12 rounded-2xl border-neutral-200 focus:border-blue-400"
                    disabled={isSaving}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="description" className="text-neutral-700 font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Grocery shopping"
                    className="h-12 rounded-2xl border-neutral-200 focus:border-blue-400"
                    disabled={isSaving}
                    required
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="category" className="text-neutral-700 font-medium">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-neutral-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoriesByType(formData.type as "income" | "expense").map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="account" className="text-neutral-700 font-medium">
                    Account
                  </Label>
                  <Select
                    value={formData.account}
                    onValueChange={(value) => setFormData({ ...formData, account: value })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-neutral-200">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} (Rp {account.balance.toLocaleString("id-ID")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="date" className="text-neutral-700 font-medium">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-12 rounded-2xl border-neutral-200 focus:border-blue-400"
                    disabled={isSaving}
                    required
                  />
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
                      {editingTransaction ? "Updating..." : "Adding..."}
                    </>
                  ) : editingTransaction ? (
                    "Update Transaction"
                  ) : (
                    "Add Transaction"
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

      {/* Prerequisites Check */}
      {(accounts.length === 0 || categories.length === 0) && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            {accounts.length === 0 && categories.length === 0
              ? "You need to create at least one account and have categories set up before adding transactions."
              : accounts.length === 0
                ? "You need to create at least one account before adding transactions."
                : "Categories are being set up. Please wait a moment before adding transactions."}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-neutral-200/50 shadow-lg">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-neutral-500" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 border-0 bg-neutral-100 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 border-0 bg-neutral-100 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction, index) => (
          <Card
            key={transaction.id}
            className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-4 rounded-2xl ${transaction.type === "income" ? "gradient-green" : "gradient-pink"}`}
                  >
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-6 w-6 text-white" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-800">{transaction.description}</h3>
                    <p className="text-neutral-600 font-medium">
                      {transaction.category_name} • {transaction.account_name}
                    </p>
                    <p className="text-sm text-neutral-500 flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div
                    className={`text-2xl font-bold ${
                      transaction.type === "income" ? "text-green-600" : "text-pink-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}Rp {transaction.amount.toLocaleString("id-ID")}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(transaction)}
                      disabled={isSaving || isDeleting === transaction.id}
                      className="text-neutral-600 hover:bg-neutral-100 rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(transaction.id)}
                      disabled={isSaving || isDeleting === transaction.id}
                      className="text-neutral-600 hover:bg-red-50 hover:text-red-600 rounded-xl"
                    >
                      {isDeleting === transaction.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => {
              const nextPage = currentPage + 1
              setCurrentPage(nextPage)
              loadTransactions(nextPage)
            }}
            disabled={isLoadingMore}
            className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {filteredTransactions.length === 0 && !isLoading && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl gradient-green flex items-center justify-center">
              <Receipt className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-3">
              {transactions.length === 0 ? "No transactions yet" : "No transactions found"}
            </h3>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              {transactions.length === 0
                ? "Add your first transaction to start tracking your finances"
                : "Try adjusting your filters or add a new transaction"}
            </p>
            {accounts.length > 0 && categories.length > 0 && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl h-12 px-8"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Transaction
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
