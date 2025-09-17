import { neon, neonConfig, Pool } from "@neondatabase/serverless"
import type { PoolClient } from "@neondatabase/serverless"

const webSocketConstructor = globalThis.WebSocket

if (webSocketConstructor) {
  neonConfig.webSocketConstructor = webSocketConstructor
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)

const transactionPool = new Pool({ connectionString: process.env.DATABASE_URL })

type TransactionSql = ReturnType<typeof createTransactionSql>

export { sql }

export async function withTransaction<T>(fn: (tx: TransactionSql) => Promise<T>) {
  const client = await transactionPool.connect()

  try {
    await client.query("BEGIN")

    const tx = createTransactionSql(client)
    const result = await fn(tx)

    await client.query("COMMIT")

    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

function createTransactionSql(client: PoolClient) {
  const tx = async (strings: TemplateStringsArray, ...params: unknown[]) => {
    const text = buildQueryText(strings, params)
    const { rows } = await client.query(text, params)
    return rows
  }

  tx.query = async (text: string, params: unknown[] = []) => {
    const { rows } = await client.query(text, params)
    return rows
  }

  return tx
}

function buildQueryText(strings: TemplateStringsArray, params: unknown[]) {
  let text = ""
  for (let i = 0; i < strings.length; i++) {
    text += strings[i]
    if (i < params.length) {
      text += `$${i + 1}`
    }
  }
  return text
}

// Database types
export interface User {
  id: string
  username?: string
  email?: string
  password_hash: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: "income" | "expense"
  color: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  color: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  type: "income" | "expense"
  amount: number
  description: string
  transaction_date: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  period: string
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

export interface ImportLog {
  id: string
  user_id: string
  filename: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  errors: any
  status: string
  created_at: string
}
