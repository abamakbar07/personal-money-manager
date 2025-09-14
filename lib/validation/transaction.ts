import { z } from "zod"

const dateSchema = z.coerce.date({ invalid_type_error: "Invalid date", required_error: "Date is required" })

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive({ message: "Amount must be greater than 0" }),
  description: z.string().trim().min(1, { message: "Description is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  account: z.string().min(1, { message: "Account is required" }),
  date: dateSchema,
})

export const transactionUpdateSchema = transactionSchema.extend({
  id: z.string().min(1, { message: "ID is required" }),
})

export const baseQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  limit: z.coerce.number().int().nonnegative().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export const transactionQuerySchema = baseQuerySchema

export const transactionByAccountQuerySchema = baseQuerySchema.extend({
  accountId: z.string().min(1, { message: "Account ID required" }),
})

export const transactionByCategoryQuerySchema = baseQuerySchema
  .extend({
    categoryId: z.string().min(1).optional(),
    categoryName: z.string().min(1).optional(),
  })
  .refine((data) => data.categoryId || data.categoryName, {
    message: "Category ID or name required",
    path: ["categoryId"],
  })

export const transactionIdSchema = z.object({
  id: z.string().min(1, { message: "Transaction ID required" }),
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>
export type TransactionQuery = z.infer<typeof transactionQuerySchema>
