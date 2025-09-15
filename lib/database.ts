import { neon, Client, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

const sql = neon(process.env.DATABASE_URL)

export { sql }

export async function withTransaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(process.env.DATABASE_URL)
  await client.connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
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
