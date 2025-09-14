"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"
import { Plus, Edit, Trash2, Target, AlertTriangle, CheckCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { getMonthlyDateRange } from "@/lib/utils"

interface Budget {
  id: string
  category: string
  amount: number
  period: string
  startDate: string
  endDate: string
}

export function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState([])
  const [monthlyStartDay, setMonthlyStartDay] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    period: "monthly",
    startDate: "",
    endDate: "",
  })

  const categories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Other",
  ]

  useEffect(() => {
    const storedBudgets = JSON.parse(localStorage.getItem("money-manager-budgets") || "[]")
    const storedTransactions = JSON.parse(localStorage.getItem("money-manager-transactions") || "[]")
    setBudgets(storedBudgets)
    setTransactions(storedTransactions)

    apiClient
      .get("/api/settings")
      .then((s) => setMonthlyStartDay(s?.monthly_start_day || 1))
      .catch(() => {})
  }, [])

  const saveBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets)
    localStorage.setItem("money-manager-budgets", JSON.stringify(newBudgets))
  }

  const calculatePeriodDates = (period: string) => {
    const now = new Date()
    let startDate, endDate

    switch (period) {
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()))
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        break
      case "monthly":
        const { startDate: start, endDate: end } = getMonthlyDateRange(monthlyStartDay)
        startDate = start
        endDate = end
        break
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date()
        endDate = new Date()
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const dates =
      formData.startDate && formData.endDate
        ? { startDate: formData.startDate, endDate: formData.endDate }
        : calculatePeriodDates(formData.period)

    const budgetData = {
      id: editingBudget?.id || Date.now().toString(),
      category: formData.category,
      amount: Number.parseFloat(formData.amount) || 0,
      period: formData.period,
      startDate: dates.startDate,
      endDate: dates.endDate,
    }

    if (editingBudget) {
      const updatedBudgets = budgets.map((b) => (b.id === editingBudget.id ? budgetData : b))
      saveBudgets(updatedBudgets)
    } else {
      saveBudgets([...budgets, budgetData])
    }

    setIsDialogOpen(false)
    setEditingBudget(null)
    setFormData({
      category: "",
      amount: "",
      period: "monthly",
      startDate: "",
      endDate: "",
    })
  }

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (budgetId: string) => {
    const updatedBudgets = budgets.filter((b) => b.id !== budgetId)
    saveBudgets(updatedBudgets)
  }

  const getBudgetProgress = (budget: Budget) => {
    const budgetTransactions = transactions.filter(
      (t) =>
        t.category === budget.category &&
        t.type === "expense" &&
        new Date(t.date) >= new Date(budget.startDate) &&
        new Date(t.date) <= new Date(budget.endDate),
    )

    const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0)
    const percentage = (spent / budget.amount) * 100

    return { spent, percentage: Math.min(percentage, 100), isOverBudget: percentage > 100 }
  }

  const getBudgetStatus = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" }
    if (percentage > 80) return { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-50" }
    return { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" }
  }

  const activeBudgets = budgets.filter((budget) => {
    const now = new Date()
    const budgetStart = new Date(budget.startDate)
    const budgetEnd = new Date(budget.endDate)
    return now >= budgetStart && now <= budgetEnd
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Budget Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? "Edit Budget" : "Create New Budget"}</DialogTitle>
              <DialogDescription>
                {editingBudget ? "Update your budget details" : "Set spending limits for different categories"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Budget Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value) => setFormData({ ...formData, period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.period === "custom" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">{editingBudget ? "Update Budget" : "Create Budget"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeBudgets.map((budget) => {
          const { spent, percentage, isOverBudget } = getBudgetProgress(budget)
          const status = getBudgetStatus(percentage, isOverBudget)
          const StatusIcon = status.icon

          return (
            <Card
              key={budget.id}
              className={`${status.bg} border-l-4 ${isOverBudget ? "border-l-red-500" : percentage > 80 ? "border-l-yellow-500" : "border-l-green-500"}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{budget.category}</CardTitle>
                  <CardDescription className="capitalize">{budget.period} budget</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIcon className={`h-5 w-5 ${status.color}`} />
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(budget)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(budget.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Spent</span>
                  <span className={`font-semibold ${isOverBudget ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : percentage > 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
                />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                  </span>
                  <span
                    className={`font-medium ${isOverBudget ? "text-red-600" : percentage > 80 ? "text-yellow-600" : "text-green-600"}`}
                  >
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                {isOverBudget && (
                  <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                    Over budget by {formatCurrency(spent - budget.amount)}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeBudgets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active budgets</h3>
            <p className="text-muted-foreground mb-4">Create your first budget to start tracking your spending goals</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {budgets.length > activeBudgets.length && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Budgets</CardTitle>
            <CardDescription>Budgets that are not currently active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgets
                .filter((budget) => !activeBudgets.includes(budget))
                .map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{budget.category}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatCurrency(budget.amount)} • {budget.period}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(budget)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
