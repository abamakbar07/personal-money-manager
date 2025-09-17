"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Folder, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color: string
  isDefault: boolean
}

const initialFormState = {
  name: "",
  type: "expense",
  color: "blue",
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState(initialFormState)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadCategories(true)
  }, [])

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(() => setSuccess(null), 5000)
    return () => clearTimeout(timer)
  }, [success])

  const mapCategory = (category: any): Category => ({
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color || "blue",
    isDefault: Boolean(category.is_default ?? category.isDefault),
  })

  const loadCategories = async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true)
    }

    try {
      setError(null)
      const data = await apiClient.get("/api/categories")

      if (Array.isArray(data)) {
        setCategories(data.map(mapCategory))
      } else if (data?.error) {
        throw new Error(data.error)
      } else {
        setCategories([])
      }
    } catch (error) {
      console.error("Error loading categories:", error)
      setError("Failed to load categories. Please refresh the page.")
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setError(null)
    setSuccess(null)

    if (!formData.name.trim()) {
      setFormError("Please enter a category name")
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type as "income" | "expense",
        color: formData.color,
      }

      const result = editingCategory
        ? await apiClient.put("/api/categories", { id: editingCategory.id, ...payload })
        : await apiClient.post("/api/categories", payload)

      if (!result || result.error) {
        throw new Error(
          result?.error || `Failed to ${editingCategory ? "update" : "create"} category`,
        )
      }

      await loadCategories()
      setSuccess(editingCategory ? "Category updated successfully!" : "Category created successfully!")
      setFormError(null)
      handleDialogOpenChange(false)
    } catch (error) {
      console.error("Error saving category:", error)
      setFormError(
        error instanceof Error
          ? error.message
          : `Failed to ${editingCategory ? "update" : "create"} category. Please try again.`,
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    if (category.isDefault) return

    setEditingCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
    })
    setFormError(null)
    setSuccess(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (category?.isDefault) return

    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return
    }

    setIsDeleting(categoryId)
    setError(null)
    setSuccess(null)

    try {
      const result = await apiClient.delete(`/api/categories?id=${categoryId}`)

      if (!result || result.error) {
        throw new Error(result?.error || "Failed to delete category")
      }

      await loadCategories()
      setSuccess("Category deleted successfully!")
    } catch (error) {
      console.error("Error deleting category:", error)
      setError(
        error instanceof Error ? error.message : "Failed to delete category. Please try again.",
      )
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)

    if (!open) {
      setEditingCategory(null)
      setFormData(initialFormState)
      setFormError(null)
    }
  }

  const handleAddCategoryClick = () => {
    setEditingCategory(null)
    setFormData(initialFormState)
    setFormError(null)
    setSuccess(null)
    setIsDialogOpen(true)
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
    return colors[color as keyof typeof colors] || colors.blue
  }

  const expenseCategories = categories.filter((cat) => cat.type === "expense")
  const incomeCategories = categories.filter((cat) => cat.type === "income")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Category Management</h2>
          <p className="text-muted-foreground">Manage your transaction categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCategoryClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update category details"
                  : "Create a new category for your transactions"}
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
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                    disabled={isSaving}
                  >
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
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                    disabled={isSaving}
                  >
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
              {formError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{formError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingCategory ? "Updating..." : "Creating..."}
                    </>
                  ) : editingCategory ? (
                    "Update Category"
                  ) : (
                    "Add Category"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={isSaving || isDeleting === category.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        disabled={isSaving || isDeleting === category.id}
                      >
                        {isDeleting === category.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        disabled={isSaving || isDeleting === category.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        disabled={isSaving || isDeleting === category.id}
                      >
                        {isDeleting === category.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
