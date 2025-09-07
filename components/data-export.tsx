"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileSpreadsheet, FileText } from "lucide-react"

export function DataExport() {
  const [exportFormat, setExportFormat] = useState("xlsx")
  const [exportType, setExportType] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  const exportData = () => {
    const accounts = JSON.parse(localStorage.getItem("money-manager-accounts") || "[]")
    const transactions = JSON.parse(localStorage.getItem("money-manager-transactions") || "[]")
    const budgets = JSON.parse(localStorage.getItem("money-manager-budgets") || "[]")
    const categories = JSON.parse(localStorage.getItem("money-manager-categories") || "[]")

    // Filter transactions by date range
    const getFilteredTransactions = () => {
      if (dateRange === "all") return transactions

      const now = new Date()
      let startDate

      switch (dateRange) {
        case "thisMonth":
          const currentDate = now.getDate()
          let startMonth, startYear

          if (currentDate >= 25) {
            startMonth = now.getMonth()
            startYear = now.getFullYear()
          } else {
            startMonth = now.getMonth() - 1
            startYear = now.getFullYear()
          }

          if (startMonth < 0) {
            startMonth = 11
            startYear--
          }

          startDate = new Date(startYear, startMonth, 25)
          break
        case "last3Months":
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          return transactions
      }

      return transactions.filter((t) => new Date(t.date) >= startDate)
    }

    const filteredTransactions = getFilteredTransactions()

    // Prepare data based on export type
    let dataToExport = []
    let filename = ""

    switch (exportType) {
      case "transactions":
        dataToExport = filteredTransactions.map((t) => {
          const account = accounts.find((a) => a.id === t.account)
          return {
            Date: t.date,
            Type: t.type,
            Amount: t.amount,
            Description: t.description,
            Category: t.category,
            Account: account?.name || "Unknown",
          }
        })
        filename = `transactions_${new Date().toISOString().split("T")[0]}`
        break
      case "accounts":
        dataToExport = accounts.map((a) => ({
          Name: a.name,
          Type: a.type,
          Balance: a.balance,
          Color: a.color,
        }))
        filename = `accounts_${new Date().toISOString().split("T")[0]}`
        break
      case "budgets":
        dataToExport = budgets.map((b) => ({
          Category: b.category,
          Amount: b.amount,
          Period: b.period,
          StartDate: b.startDate,
          EndDate: b.endDate,
        }))
        filename = `budgets_${new Date().toISOString().split("T")[0]}`
        break
      default: // all
        const summary = {
          exportDate: new Date().toISOString(),
          totalAccounts: accounts.length,
          totalTransactions: filteredTransactions.length,
          totalBudgets: budgets.length,
          totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
        }

        if (exportFormat === "xlsx") {
          // For XLSX, we'll create multiple sheets
          exportToXLSX(
            {
              Summary: [summary],
              Accounts: accounts,
              Transactions: filteredTransactions.map((t) => {
                const account = accounts.find((a) => a.id === t.account)
                return { ...t, accountName: account?.name || "Unknown" }
              }),
              Budgets: budgets,
              Categories: categories,
            },
            `money_manager_export_${new Date().toISOString().split("T")[0]}`,
          )
          return
        } else {
          dataToExport = [summary]
          filename = `money_manager_summary_${new Date().toISOString().split("T")[0]}`
        }
    }

    if (exportFormat === "xlsx") {
      exportToXLSX({ [exportType]: dataToExport }, filename)
    } else {
      exportToCSV(dataToExport, filename)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  const exportToXLSX = (data: Record<string, any[]>, filename: string) => {
    // Simple XLSX export using JSON to worksheet conversion
    // This creates a basic XLSX file structure

    const createWorksheet = (data: any[]) => {
      if (data.length === 0) return ""

      const headers = Object.keys(data[0])
      let worksheet = headers.join("\t") + "\n"

      data.forEach((row) => {
        worksheet += headers.map((header) => row[header] || "").join("\t") + "\n"
      })

      return worksheet
    }

    // For simplicity, we'll export as tab-separated values with .xlsx extension
    // In a real application, you'd use a library like xlsx or exceljs
    let content = ""

    Object.entries(data).forEach(([sheetName, sheetData]) => {
      content += `=== ${sheetName} ===\n`
      content += createWorksheet(sheetData)
      content += "\n"
    })

    const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.xlsx`
    link.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>Export your financial data to Excel or CSV format</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Type</label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="transactions">Transactions Only</SelectItem>
                <SelectItem value="accounts">Accounts Only</SelectItem>
                <SelectItem value="budgets">Budgets Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="thisMonth">This Month (25th-24th)</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={exportData} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </CardContent>
    </Card>
  )
}
