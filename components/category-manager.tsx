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
import { Plus, Edit, Trash2, Folder } from "lucide-react"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color: string
  isDefault: boolean
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    color: "blue",
  })

  const defaultCategories: Category[] = [
    // Expense categories
    { id: "food", name: "Food & Dining", type: "expense", color: "red", isDefault: true },
    { id: "transport", name: "Transportation", type: "expense", color: "blue", isDefault: true },
    { id: "shopping", name: "Shopping", type: "expense", color: "purple", isDefault: true },
    { id: "entertainment", name: "Entertainment", type: "expense", color: "pink", isDefault: true },
    { id: "bills", name: "Bills & Utilities", type: "expense", color: "yellow", isDefault: true },
    { id: "healthcare", name: "Healthcare", type: "expense", color: "green", isDefault: true },
    { id: "education", name: "Education", type: "expense", color: "indigo", isDefault: true },
    { id: "travel", name: "Travel", type: "expense", color: "teal", isDefault: true },
    { id: "transfer", name: "Transfer", type: "expense", color: "gray", isDefault: true },
    { id: "other-expense", name: "Other", type: "expense", color: "gray", isDefault: true },

    // Income categories
    { id: "salary", name: "Salary", type: "income", color: "green", isDefault: true },
    { id: "freelance", name: "Freelance", type: "income", color: "blue", isDefault: true },
    { id: "investment", name: "Investment", type: "income", color: "purple", isDefault: true },
    { id: "gift", name: "Gift", type: "income", color: "pink", isDefault: true },
    { id: "bonus", name: "Bonus", type: "income", color: "yellow", isDefault: true },
    { id: "transfer-income", name: "Transfer", type: "income", color: "gray", isDefault: true },
    { id: "other-income", name: "Other", type: "income", color: "gray", isDefault: true },
  ]

  useEffect(() => {
    const storedCategories = JSON.parse(localStorage.getItem("money-manager-categories") || "[]")
    if (storedCategories.length === 0) {
      // Initialize with default categories
      setCategories(defaultCategories)
      localStorage.setItem("money-manager-categories", JSON.stringify(defaultCategories))
    } else {
      setCategories(storedCategories)
    }
  }, [])

  const saveCategories = (newCategories: Category[]) => {
    setCategories(newCategories)
    localStorage.setItem("money-manager-categories", JSON.stringify(newCategories))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const categoryData = {
      id: editingCategory?.id || Date.now().toString(),
      name: formData.name,
      type: formData.type as "income" | "expense",
      color: formData.color,
      isDefault: false,
    }

    if (editingCategory) {
      const updatedCategories = categories.map((cat) => (cat.id === editingCategory.id ? categoryData : cat))
      saveCategories(updatedCategories)
    } else {
      saveCategories([...categories, categoryData])
    }

    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({ name: "", type: "expense", color: "blue" })
  }

  const handleEdit = (category: Category) => {
    if (category.isDefault) return // Prevent editing default categories
    setEditingCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (category?.isDefault) return // Prevent deleting default categories

    const updatedCategories = categories.filter((cat) => cat.id !== categoryId)
    saveCategories(updatedCategories)
  }

  const getColorClass = (color: string) => {
    const colors = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
      yellow: "bg-yellow-500",
      pink: "bg-pink-500",
      indigo: "bg-indigo-500",
      teal: "bg-teal-500",
      gray: "bg-gray-500",
    }
    return colors[color] || colors.blue
  }

  const expenseCategories = categories.filter((cat) => cat.type === "expense")
  const incomeCategories = categories.filter((cat) => cat.type === "income")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Category Management</h2>
          <p className="text-muted-foreground">Manage your transaction categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Update category details" : "Create a new category for your transactions"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Groceries"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                      <SelectItem value="indigo">Indigo</SelectItem>
                      <SelectItem value="teal">Teal</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingCategory ? "Update Category" : "Add Category"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-red-500" />
              Expense Categories
            </CardTitle>
            <CardDescription>Categories for your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getColorClass(category.color)}`}></div>
                    <span className="font-medium">{category.name}</span>
                    {category.isDefault && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Default</span>
                    )}
                  </div>
                  {!category.isDefault && (
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-green-500" />
              Income Categories
            </CardTitle>
            <CardDescription>Categories for your income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incomeCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getColorClass(category.color)}`}></div>
                    <span className="font-medium">{category.name}</span>
                    {category.isDefault && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Default</span>
                    )}
                  </div>
                  {!category.isDefault && (
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
