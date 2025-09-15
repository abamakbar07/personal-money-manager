import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
import { transactionSchema } from "@/lib/validation/transaction"
import { POST } from "@/app/api/transactions/route"

vi.mock("@/lib/auth", () => ({ verifySession: vi.fn().mockResolvedValue("user1") }))
vi.mock("@/lib/database", () => ({ sql: vi.fn() }))

describe("transaction schema", () => {
  it("rejects negative amount", () => {
    const result = transactionSchema.safeParse({
      type: "income",
      amount: -5,
      description: "test",
      category: "1",
      account: "1",
      date: "2024-01-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing fields", () => {
    const result = transactionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("POST /api/transactions", () => {
  it("returns 400 for invalid payload", async () => {
    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        type: "income",
        amount: -1,
        description: "bad",
        category: "1",
        account: "1",
        date: "2024-01-01",
      }),
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer token",
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
