import { db } from '../db';
import { budgetsTable, transactionsTable, categoriesTable } from '../db/schema';
import { type BudgetStatus } from '../schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const getBudgetStatus = async (): Promise<BudgetStatus[]> => {
  try {
    // Get all budgets with their categories
    const budgets = await db
      .select({
        id: budgetsTable.id,
        category_id: budgetsTable.category_id,
        category_name: categoriesTable.name,
        budget_amount: budgetsTable.amount,
        period: budgetsTable.period,
        start_date: budgetsTable.start_date,
        end_date: budgetsTable.end_date,
      })
      .from(budgetsTable)
      .innerJoin(categoriesTable, eq(budgetsTable.category_id, categoriesTable.id))
      .execute();

    const budgetStatuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      // Calculate the effective end date for budget period
      const currentDate = new Date();
      const startDate = new Date(budget.start_date);
      let effectiveEndDate: Date | null = budget.end_date ? new Date(budget.end_date) : null;
      
      // If no end date is specified, calculate it based on the period
      if (!effectiveEndDate) {
        effectiveEndDate = new Date(startDate);
        switch (budget.period) {
          case 'weekly':
            effectiveEndDate.setDate(effectiveEndDate.getDate() + 7);
            break;
          case 'monthly':
            effectiveEndDate.setMonth(effectiveEndDate.getMonth() + 1);
            break;
          case 'yearly':
            effectiveEndDate.setFullYear(effectiveEndDate.getFullYear() + 1);
            break;
        }
      }

      // Note: We include all budgets regardless of their active status
      // This allows users to see historical and future budget data

      // Calculate spent amount for this budget period
      const spentResult = await db
        .select({
          total_spent: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)`
        })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.category_id, budget.category_id),
            eq(transactionsTable.type, 'expense'),
            gte(transactionsTable.date, budget.start_date),
            effectiveEndDate ? lte(transactionsTable.date, effectiveEndDate.toISOString().split('T')[0]) : undefined
          )
        )
        .execute();

      const spentAmount = parseInt(spentResult[0].total_spent) || 0;
      const budgetAmount = budget.budget_amount;
      const remainingAmount = budgetAmount - spentAmount;
      const percentageUsed = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
      const isOverBudget = spentAmount > budgetAmount;

      budgetStatuses.push({
        id: budget.id,
        category_id: budget.category_id,
        category_name: budget.category_name,
        budget_amount: budgetAmount,
        spent_amount: spentAmount,
        remaining_amount: remainingAmount,
        percentage_used: percentageUsed,
        period: budget.period,
        start_date: startDate,
        end_date: effectiveEndDate,
        is_over_budget: isOverBudget
      });
    }

    return budgetStatuses;
  } catch (error) {
    console.error('Get budget status failed:', error);
    throw error;
  }
};