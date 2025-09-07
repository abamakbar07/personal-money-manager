"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number
  description: string
  transaction_date: string
  account_name: string
  category_name: string
}

interface TransactionHistoryProps {
  accountId?: string
  accountName?: string
  categoryId?: string
  categoryName?: string
  onBack: () => void
}

export function TransactionHistory({
  accountId,
  accountName,
  categoryId,
  categoryName,
  onBack,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const pageSize = 20

  useEffect(() => {
    loadTransactions()
  }, [accountId, categoryId, currentPage, sortBy, sortOrder, filterType])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      let endpoint = ""
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      })

      if (accountId) {
        endpoint = `/api/transactions/by-account?accountId=${accountId}&${params}`
      } else if (categoryId) {
        endpoint = `/api/transactions/by-category?categoryId=${categoryId}&${params}`
      } else if (categoryName) {
        endpoint = `/api/transactions/by-category?categoryName=${encodeURIComponent(categoryName)}&${params}`
      }

      const response = await apiClient.get(endpoint)

      if (response) {
        setTransactions(response.transactions || [])
        setHasMore(response.hasMore || false)
        setTotal(response.total || 0)
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || transaction.type === filterType
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          break
        case "amount":
          comparison = a.amount - b.amount
          break
        case "description":
          comparison = a.description.localeCompare(b.description)
          break
        default:
          comparison = 0
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="rounded-xl hover:bg-neutral-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-800">Transaction History</h1>
            <p className="text-neutral-600">
              {accountName && `Account: ${accountName}`}
              {categoryName && `Category: ${categoryName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="gradient-blue border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold">{filteredTransactions.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-green border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Income</p>
                <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-white/70" />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-pink border-0 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-white/70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-neutral-200"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32 h-10 rounded-xl border-neutral-200">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-10 rounded-xl border-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-10 rounded-xl border-neutral-200"
            >
              {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} of {total} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
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
                      <h4 className="font-semibold text-neutral-800">{transaction.description}</h4>
                      <div className="flex items-center space-x-2 text-sm text-neutral-500">
                        <span>{formatDate(transaction.transaction_date)}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {transaction.category_name}
                        </Badge>
                        {!accountName && (
                          <>
                            <span>•</span>
                            <span>{transaction.account_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      transaction.type === "income" ? "text-green-600" : "text-pink-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={loading}
                className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
