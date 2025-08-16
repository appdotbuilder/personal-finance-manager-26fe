import { z } from 'zod';

// Transaction type enum
export const transactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(), // Hex color code for UI display
  icon: z.string().nullable(), // Icon name or emoji
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  amount: z.number(), // Amount in cents to avoid floating point issues
  description: z.string(),
  type: transactionTypeSchema,
  category_id: z.number().nullable(), // Can be uncategorized
  date: z.coerce.date(), // Transaction date
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Budget schema
export const budgetSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  amount: z.number(), // Budget limit in cents
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(), // Can be ongoing
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Budget = z.infer<typeof budgetSchema>;

// Input schemas for creating entities

// Create category input
export const createCategoryInputSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex code"),
  icon: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Create transaction input
export const createTransactionInputSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  type: transactionTypeSchema,
  category_id: z.number().nullable(),
  date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Create budget input
export const createBudgetInputSchema = z.object({
  category_id: z.number(),
  amount: z.number().positive("Budget amount must be positive"),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable()
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

// Update schemas

// Update category input
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Update transaction input
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  type: transactionTypeSchema.optional(),
  category_id: z.number().nullable().optional(),
  date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Update budget input
export const updateBudgetInputSchema = z.object({
  id: z.number(),
  category_id: z.number().optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().nullable().optional()
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetInputSchema>;

// Query schemas for filtering and reporting

// Date range filter
export const dateRangeSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type DateRange = z.infer<typeof dateRangeSchema>;

// Transaction filter
export const transactionFilterSchema = z.object({
  type: transactionTypeSchema.optional(),
  category_id: z.number().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type TransactionFilter = z.infer<typeof transactionFilterSchema>;

// Financial report schema
export const financialReportSchema = z.object({
  total_income: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  expense_by_category: z.array(z.object({
    category_id: z.number().nullable(),
    category_name: z.string().nullable(),
    total_amount: z.number()
  })),
  period: dateRangeSchema
});

export type FinancialReport = z.infer<typeof financialReportSchema>;

// Budget status schema
export const budgetStatusSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  category_name: z.string(),
  budget_amount: z.number(),
  spent_amount: z.number(),
  remaining_amount: z.number(),
  percentage_used: z.number(),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullable(),
  is_over_budget: z.boolean()
});

export type BudgetStatus = z.infer<typeof budgetStatusSchema>;