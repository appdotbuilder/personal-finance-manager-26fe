import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  createBudgetInputSchema,
  updateBudgetInputSchema,
  transactionFilterSchema,
  dateRangeSchema
} from './schema';

// Import handlers
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { createBudget } from './handlers/create_budget';
import { getBudgets } from './handlers/get_budgets';
import { getBudgetStatus } from './handlers/get_budget_status';
import { updateBudget } from './handlers/update_budget';
import { deleteBudget } from './handlers/delete_budget';
import { getFinancialReport } from './handlers/get_financial_report';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Category management endpoints
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),
  
  deleteCategory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCategory(input)),

  // Transaction management endpoints
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransactions: publicProcedure
    .input(transactionFilterSchema.optional())
    .query(({ input }) => getTransactions(input)),
  
  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),
  
  deleteTransaction: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTransaction(input)),

  // Budget management endpoints
  createBudget: publicProcedure
    .input(createBudgetInputSchema)
    .mutation(({ input }) => createBudget(input)),
  
  getBudgets: publicProcedure
    .query(() => getBudgets()),
  
  getBudgetStatus: publicProcedure
    .query(() => getBudgetStatus()),
  
  updateBudget: publicProcedure
    .input(updateBudgetInputSchema)
    .mutation(({ input }) => updateBudget(input)),
  
  deleteBudget: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteBudget(input)),

  // Financial reporting endpoints
  getFinancialReport: publicProcedure
    .input(dateRangeSchema)
    .query(({ input }) => getFinancialReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Management TRPC server listening at port: ${port}`);
}

start();