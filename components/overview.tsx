"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  AlertCircle,
  Loader2,
} from "lucide-react"
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

interface Budget {
  id: string
  category_name: string
  amount: number
  start_date: string
  end_date: string
}

export function Overview() {
  const [period, setPeriod] = useState("thisMonth")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [accountsData, transactionsData, budgetsData] = await Promise.all([
        apiClient.get("/api/accounts"),
        apiClient.get("/api/transactions"),
        apiClient.get("/api/budgets"),
      ])

      setAccounts(accountsData || [])
      setTransactions(transactionsData || [])
      setBudgets(budgetsData || [])
    } catch (error) {
      console.error("Error loading overview data:", error)
      setError("Failed to load overview data. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  const getFilteredTransactions = () => {
    const now = new Date()

    const getCustomMonthRange = () => {
      const currentDate = now.getDate()
      let startMonth, startYear, endMonth, endYear

      if (currentDate >= 25) {
        startMonth = now.getMonth()
        startYear = now.getFullYear()
        endMonth = now.getMonth() + 1
        endYear = now.getFullYear()
      } else {
        startMonth = now.getMonth() - 1
        startYear = now.getFullYear()
        endMonth = now.getMonth()
        endYear = now.getFullYear()
      }

      if (startMonth < 0) {
        startMonth = 11
        startYear--
      }
      if (endMonth > 11) {
        endMonth = 0
        endYear++
      }

      const startDate = new Date(startYear, startMonth, 25)
      const endDate = new Date(endYear, endMonth, 24, 23, 59, 59)

      return { startDate, endDate }
    }

    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transaction_date)
      switch (period) {
        case "thisWeek":
          return transactionDate >= startOfWeek
        case "thisMonth":
          const { startDate, endDate } = getCustomMonthRange()
          return transactionDate >= startDate && transactionDate <= endDate
        case "last30Days":
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return transactionDate >= thirtyDaysAgo
        default:
          return true
      }
    })
  }

  const filteredTransactions = getFilteredTransactions()
  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const activeBudgets = budgets.filter((budget) => {
    const now = new Date()
    const budgetStart = new Date(budget.start_date)
    const budgetEnd = new Date(budget.end_date)
    return now >= budgetStart && now <= budgetEnd
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-neutral-600">Loading overview...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-2">Financial Overview</h1>
          <p className="text-neutral-600">Track your money, achieve your goals</p>
        </div>
        <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-neutral-200/50">
          <Calendar className="h-4 w-4 text-neutral-500" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="last30Days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-purple border-0 text-white shadow-xl animate-slide-in-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Wallet className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-70" />
            </div>
            <div className="space-y-2">
              <p className="text-white/80 text-sm font-medium">Total Balance</p>
              <p className="text-2xl lg:text-3xl font-bold">Rp {totalBalance.toLocaleString("id-ID")}</p>
              <p className="text-white/70 text-xs">{accounts.length} accounts</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="gradient-green border-0 text-white shadow-xl animate-slide-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-70" />
            </div>
            <div className="space-y-2">
              <p className="text-white/80 text-sm font-medium">Income</p>
              <p className="text-2xl lg:text-3xl font-bold">Rp {totalIncome.toLocaleString("id-ID")}</p>
              <p className="text-white/70 text-xs">
                {period === "thisWeek" ? "This week" : period === "thisMonth" ? "This month" : "Last 30 days"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="gradient-pink border-0 text-white shadow-xl animate-slide-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <TrendingDown className="h-6 w-6" />
              </div>
              <ArrowDownRight className="h-5 w-5 opacity-70" />
            </div>
            <div className="space-y-2">
              <p className="text-white/80 text-sm font-medium">Expenses</p>
              <p className="text-2xl lg:text-3xl font-bold">Rp {totalExpenses.toLocaleString("id-ID")}</p>
              <p className="text-white/70 text-xs">
                {period === "thisWeek" ? "This week" : period === "thisMonth" ? "This month" : "Last 30 days"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="gradient-orange border-0 text-white shadow-xl animate-slide-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Target className="h-6 w-6" />
              </div>
              {totalIncome - totalExpenses >= 0 ? (
                <ArrowUpRight className="h-5 w-5 opacity-70" />
              ) : (
                <ArrowDownRight className="h-5 w-5 opacity-70" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-white/80 text-sm font-medium">Net Income</p>
              <p className="text-2xl lg:text-3xl font-bold">
                Rp {(totalIncome - totalExpenses).toLocaleString("id-ID")}
              </p>
              <p className="text-white/70 text-xs">Income - Expenses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-neutral-800">Recent Activity</CardTitle>
            <CardDescription className="text-neutral-600">Your latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.slice(0, 5).map((transaction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50/50 hover:bg-neutral-100/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-2xl ${
                        transaction.type === "income" ? "gradient-green" : "gradient-pink"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4 text-white" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-800">{transaction.description}</p>
                      <p className="text-sm text-neutral-500">{transaction.category_name}</p>
                    </div>
                  </div>
                  <div
                    className={`font-bold text-lg ${
                      transaction.type === "income" ? "text-green-600" : "text-pink-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}Rp {transaction.amount.toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-blue flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-neutral-500">No transactions found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-neutral-800">Budget Progress</CardTitle>
            <CardDescription className="text-neutral-600">Your current budget status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activeBudgets.slice(0, 5).map((budget, index) => {
                const spent = filteredTransactions
                  .filter((t) => t.category_name === budget.category_name && t.type === "expense")
                  .reduce((sum, t) => sum + t.amount, 0)
                const percentage = (spent / budget.amount) * 100

                return (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            percentage > 100 ? "bg-red-500" : percentage > 80 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                        ></div>
                        <p className="font-semibold text-neutral-800">{budget.category_name}</p>
                      </div>
                      <p className="text-sm text-neutral-500 font-medium">
                        Rp {spent.toLocaleString("id-ID")} / Rp {budget.amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          percentage > 100 ? "bg-red-500" : percentage > 80 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm font-medium ${
                          percentage > 100 ? "text-red-600" : percentage > 80 ? "text-yellow-600" : "text-green-600"
                        }`}
                      >
                        {percentage.toFixed(1)}% used
                      </span>
                      {percentage > 100 && (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">Over budget</span>
                      )}
                    </div>
                  </div>
                )
              })}
              {activeBudgets.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-purple flex items-center justify-center">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-neutral-500">No active budgets</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
