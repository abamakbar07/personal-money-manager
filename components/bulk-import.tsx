"use client"

import type React from "react"

import { useState, useRef } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Info } from "lucide-react"

interface ImportError {
  row: number
  field: string
  message: string
  data: any
}

interface ImportResult {
  success: boolean
  totalRows: number
  successfulRows: number
  failedRows: number
  errors: ImportError[]
}

export function BulkImport() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      uploadFile(file)
    } else {
      alert("Please select a valid Excel file (.xlsx or .xls)")
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setImportResult(null)

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await apiClient.postFormData("/api/import", formData)

      setUploadProgress(100)
      setImportResult(result)
    } catch (error) {
      console.error("Import error:", error)
      const status = (error as { status?: number } | undefined)?.status
      let message = error instanceof Error ? error.message : "Import failed"

      if (status === 401) {
        message = "Your session has expired. Please log in again."
      }

      setImportResult({
        success: false,
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [{ row: 0, field: "general", message, data: null }],
      })
    } finally {
      clearInterval(progressInterval)
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const downloadTemplate = () => {
    const template = `Date,Type,Amount,Description,Category,Account
2024-01-01,expense,50000,Grocery shopping,Food & Dining,Main Checking
2024-01-02,income,1000000,Salary,Salary,Main Checking
2024-01-03,expense,25000,Coffee,Food & Dining,Main Checking`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "money_manager_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-2">Bulk Import</h1>
        <p className="text-neutral-600">Import your financial data from Excel files</p>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50/50 border-blue-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-blue-700">
          <div>
            <h4 className="font-semibold mb-2">Required Columns:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Date:</strong> Transaction date (YYYY-MM-DD format)
              </li>
              <li>
                <strong>Type:</strong> "income" or "expense"
              </li>
              <li>
                <strong>Amount:</strong> Transaction amount (positive numbers only)
              </li>
              <li>
                <strong>Description:</strong> Transaction description
              </li>
              <li>
                <strong>Category:</strong> Category name (will be created if doesn't exist)
              </li>
              <li>
                <strong>Account:</strong> Account name (must exist in your accounts)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Tips:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Make sure your accounts exist before importing</li>
              <li>Categories will be created automatically if they don't exist</li>
              <li>Use consistent naming for better organization</li>
              <li>The first row should contain column headers</li>
            </ul>
          </div>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-100 bg-transparent"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>Drag and drop your Excel file here, or click to browse</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl gradient-blue flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-800 mb-2">Drop your Excel file here</p>
                <p className="text-neutral-600 mb-4">Supports .xlsx and .xls files up to 10MB</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gradient-purple border-0 text-white shadow-lg hover:scale-105 transition-all duration-200 rounded-2xl"
                >
                  {isUploading ? "Processing..." : "Browse Files"}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {/* Progress */}
          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {importResult && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-2xl bg-neutral-100">
                <div className="text-2xl font-bold text-neutral-800">{importResult.totalRows}</div>
                <div className="text-sm text-neutral-600">Total Rows</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-green-100">
                <div className="text-2xl font-bold text-green-600">{importResult.successfulRows}</div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-red-100">
                <div className="text-2xl font-bold text-red-600">{importResult.failedRows}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {/* Success Message */}
            {importResult.successfulRows > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Successfully imported {importResult.successfulRows} transactions!
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-red-800">Import Errors:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {importResult.errors.map((error, index) => (
                    <Alert key={index} className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        <strong>Row {error.row}:</strong> {error.message}
                        {error.field !== "general" && <span className="text-sm"> (Field: {error.field})</span>}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
