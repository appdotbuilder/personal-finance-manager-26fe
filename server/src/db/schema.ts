import { serial, text, pgTable, timestamp, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for transaction types
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

// Enum for budget periods
export const budgetPeriodEnum = pgEnum('budget_period', ['weekly', 'monthly', 'yearly']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(), // Hex color code
  icon: text('icon'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  amount: integer('amount').notNull(), // Amount in cents
  description: text('description').notNull(),
  type: transactionTypeEnum('type').notNull(),
  category_id: integer('category_id'), // Nullable - can be uncategorized
  date: date('date').notNull(), // Transaction date
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Budgets table
export const budgetsTable = pgTable('budgets', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id').notNull(),
  amount: integer('amount').notNull(), // Budget limit in cents
  period: budgetPeriodEnum('period').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'), // Nullable - can be ongoing
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  transactions: many(transactionsTable),
  budgets: many(budgetsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [transactionsTable.category_id],
    references: [categoriesTable.id],
  }),
}));

export const budgetsRelations = relations(budgetsTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [budgetsTable.category_id],
    references: [categoriesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Budget = typeof budgetsTable.$inferSelect;
export type NewBudget = typeof budgetsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  categories: categoriesTable,
  transactions: transactionsTable,
  budgets: budgetsTable,
};

export const relations_exports = {
  categoriesRelations,
  transactionsRelations,
  budgetsRelations,
};