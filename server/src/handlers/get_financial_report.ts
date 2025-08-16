import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type FinancialReport, type DateRange } from '../schema';
import { eq, and, gte, lte, isNull, sum } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function getFinancialReport(dateRange: DateRange): Promise<FinancialReport> {
  try {
    // Build base conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    if (dateRange.start_date) {
      conditions.push(gte(transactionsTable.date, dateRange.start_date.toISOString().split('T')[0]));
    }

    if (dateRange.end_date) {
      conditions.push(lte(transactionsTable.date, dateRange.end_date.toISOString().split('T')[0]));
    }

    // Query for total income
    let incomeQuery = db.select({
      total: sum(transactionsTable.amount)
    })
    .from(transactionsTable)
    .where(
      conditions.length > 0 
        ? and(eq(transactionsTable.type, 'income'), ...conditions)
        : eq(transactionsTable.type, 'income')
    );

    const incomeResult = await incomeQuery.execute();
    const totalIncome = parseInt(incomeResult[0]?.total || '0');

    // Query for total expenses
    let expenseQuery = db.select({
      total: sum(transactionsTable.amount)
    })
    .from(transactionsTable)
    .where(
      conditions.length > 0
        ? and(eq(transactionsTable.type, 'expense'), ...conditions)
        : eq(transactionsTable.type, 'expense')
    );

    const expenseResult = await expenseQuery.execute();
    const totalExpenses = parseInt(expenseResult[0]?.total || '0');

    // Query for expense breakdown by category
    let categoryQuery = db.select({
      category_id: transactionsTable.category_id,
      category_name: categoriesTable.name,
      total_amount: sum(transactionsTable.amount)
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
    .where(
      conditions.length > 0
        ? and(eq(transactionsTable.type, 'expense'), ...conditions)
        : eq(transactionsTable.type, 'expense')
    )
    .groupBy(transactionsTable.category_id, categoriesTable.name);

    const categoryResults = await categoryQuery.execute();

    const expenseByCategory = categoryResults.map(result => ({
      category_id: result.category_id,
      category_name: result.category_name || null,
      total_amount: parseInt(result.total_amount || '0')
    }));

    const netIncome = totalIncome - totalExpenses;

    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: netIncome,
      expense_by_category: expenseByCategory,
      period: dateRange
    };
  } catch (error) {
    console.error('Financial report generation failed:', error);
    throw error;
  }
}