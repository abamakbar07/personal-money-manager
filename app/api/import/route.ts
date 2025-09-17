import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/database"
import { verifySession } from "@/lib/auth"
import * as XLSX from "xlsx"

interface ImportRow {
  date?: string
  type?: string
  amount?: number
  description?: string
  category?: string
  account?: string
  [key: string]: any
}

function getDeviceId(request: NextRequest): string {
  return request.headers.get("x-device-id") || request.headers.get("user-agent") || "unknown-device"
}

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken = request.headers.get("authorization")?.replace("Bearer ", "")
  if (!sessionToken) return null

  const deviceId = getDeviceId(request)
  return await verifySession(sessionToken, deviceId)
}

interface ImportError {
  row: number
  field: string
  message: string
  data: any
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "Only Excel files (.xlsx, .xls) are supported" }, { status: 400 })
    }

    // Read file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })

    // Get first worksheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return NextResponse.json({ error: "File must contain at least a header row and one data row" }, { status: 400 })
    }

    // Parse headers and data
    const headers = rawData[0].map((h: any) => String(h).toLowerCase().trim())
    const dataRows = rawData.slice(1)

    // Map headers to expected fields
    const headerMap = {
      date: ["date", "transaction_date", "transaction date", "tanggal"],
      type: ["type", "transaction_type", "transaction type", "tipe"],
      amount: ["amount", "value", "nominal", "jumlah"],
      description: ["description", "desc", "note", "keterangan", "deskripsi"],
      category: ["category", "kategori"],
      account: ["account", "account_name", "account name", "akun"],
    }

    const fieldIndexes: { [key: string]: number } = {}

    // Find column indexes
    Object.entries(headerMap).forEach(([field, possibleHeaders]) => {
      const index = headers.findIndex((h) => possibleHeaders.includes(h))
      if (index !== -1) {
        fieldIndexes[field] = index
      }
    })

    // Validate required columns
    const requiredFields = ["date", "type", "amount", "description"]
    const missingFields = requiredFields.filter((field) => fieldIndexes[field] === undefined)

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingFields.join(", ")}. Please ensure your Excel file has these columns.`,
        },
        { status: 400 },
      )
    }

    // Get existing accounts and categories
    const [accounts, categories] = await Promise.all([
      sql`SELECT id, name FROM accounts WHERE user_id = ${userId}`,
      sql`SELECT id, name, type FROM categories WHERE user_id = ${userId}`,
    ])

    const accountMap = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]))
    const categoryMap = new Map(categories.map((c) => [`${c.name.toLowerCase()}_${c.type}`, c.id]))

    // Process data
    const errors: ImportError[] = []
    const validRows: ImportRow[] = []
    let successCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 because we start from row 2 in Excel (after header)

      try {
        const importRow: ImportRow = {}

        // Extract data
        if (fieldIndexes.date !== undefined) {
          const dateValue = row[fieldIndexes.date]
          if (dateValue) {
            // Handle Excel date formats
            if (typeof dateValue === "number") {
              // Excel date serial number
              const excelDate = new Date((dateValue - 25569) * 86400 * 1000)
              importRow.date = excelDate.toISOString().split("T")[0]
            } else {
              // String date
              const parsedDate = new Date(dateValue)
              if (isNaN(parsedDate.getTime())) {
                errors.push({
                  row: rowNumber,
                  field: "date",
                  message: "Invalid date format",
                  data: dateValue,
                })
                continue
              }
              importRow.date = parsedDate.toISOString().split("T")[0]
            }
          }
        }

        if (fieldIndexes.type !== undefined) {
          const typeValue = String(row[fieldIndexes.type]).toLowerCase().trim()
          if (
            typeValue === "income" ||
            typeValue === "expense" ||
            typeValue === "pemasukan" ||
            typeValue === "pengeluaran"
          ) {
            importRow.type = typeValue === "pemasukan" ? "income" : typeValue === "pengeluaran" ? "expense" : typeValue
          } else {
            errors.push({
              row: rowNumber,
              field: "type",
              message: 'Type must be "income" or "expense"',
              data: typeValue,
            })
            continue
          }
        }

        if (fieldIndexes.amount !== undefined) {
          const amountValue = row[fieldIndexes.amount]
          if (typeof amountValue === "number") {
            importRow.amount = Math.abs(amountValue) // Ensure positive
          } else {
            const parsed = Number.parseFloat(String(amountValue).replace(/[^\d.-]/g, ""))
            if (isNaN(parsed) || parsed <= 0) {
              errors.push({
                row: rowNumber,
                field: "amount",
                message: "Amount must be a positive number",
                data: amountValue,
              })
              continue
            }
            importRow.amount = Math.abs(parsed)
          }
        }

        if (fieldIndexes.description !== undefined) {
          importRow.description = String(row[fieldIndexes.description] || "").trim()
          if (!importRow.description) {
            errors.push({
              row: rowNumber,
              field: "description",
              message: "Description is required",
              data: "",
            })
            continue
          }
        }

        if (fieldIndexes.category !== undefined) {
          const categoryName = String(row[fieldIndexes.category] || "").trim()
          if (categoryName) {
            const categoryKey = `${categoryName.toLowerCase()}_${importRow.type}`
            const categoryId = categoryMap.get(categoryKey)
            if (categoryId) {
              importRow.category = categoryName
            } else {
              // Create new category if it doesn't exist
              try {
                const [newCategory] = await sql`
                  INSERT INTO categories (user_id, name, type, color, is_default)
                  VALUES (${userId}, ${categoryName}, ${importRow.type}, 'blue', false)
                  RETURNING id, name
                `
                categoryMap.set(categoryKey, newCategory.id)
                importRow.category = categoryName
              } catch (err) {
                importRow.category = "Other" // Fallback to default
              }
            }
          } else {
            importRow.category = "Other" // Default category
          }
        } else {
          importRow.category = "Other" // Default category
        }

        if (fieldIndexes.account !== undefined) {
          const accountName = String(row[fieldIndexes.account] || "").trim()
          if (accountName) {
            const accountId = accountMap.get(accountName.toLowerCase())
            if (accountId) {
              importRow.account = accountName
            } else {
              errors.push({
                row: rowNumber,
                field: "account",
                message: `Account "${accountName}" not found. Please create it first.`,
                data: accountName,
              })
              continue
            }
          } else {
            errors.push({
              row: rowNumber,
              field: "account",
              message: "Account is required",
              data: "",
            })
            continue
          }
        } else {
          errors.push({
            row: rowNumber,
            field: "account",
            message: "Account column is required",
            data: "",
          })
          continue
        }

        validRows.push(importRow)
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: "general",
          message: "Failed to process row",
          data: error.message,
        })
      }
    }

    // Import valid rows
    for (const row of validRows) {
      try {
        // Get account and category IDs
        const accountId = accountMap.get(row.account!.toLowerCase())
        const categoryKey = `${row.category!.toLowerCase()}_${row.type}`
        const categoryId = categoryMap.get(categoryKey)

        // Insert transaction
        await sql`
          INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, transaction_date)
          VALUES (${userId}, ${accountId}, ${categoryId}, ${row.type}, ${row.amount}, ${row.description}, ${row.date})
        `

        // Update account balance
        if (row.type === "income") {
          await sql`
            UPDATE accounts 
            SET balance = balance + ${row.amount}
            WHERE id = ${accountId}
          `
        } else {
          await sql`
            UPDATE accounts 
            SET balance = balance - ${row.amount}
            WHERE id = ${accountId}
          `
        }

        successCount++
      } catch (error) {
        errors.push({
          row: validRows.indexOf(row) + 2,
          field: "database",
          message: "Failed to save to database",
          data: error.message,
        })
      }
    }

    // Log import
    await sql`
      INSERT INTO import_logs (user_id, filename, total_rows, successful_rows, failed_rows, errors, status)
      VALUES (${userId}, ${file.name}, ${dataRows.length}, ${successCount}, ${errors.length}, ${JSON.stringify(errors)}, 'completed')
    `

    return NextResponse.json({
      success: true,
      totalRows: dataRows.length,
      successfulRows: successCount,
      failedRows: errors.length,
      errors: errors.slice(0, 50), // Limit errors returned to prevent large responses
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to process import file" }, { status: 500 })
  }
}
