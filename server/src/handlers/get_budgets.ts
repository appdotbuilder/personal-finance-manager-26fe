import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type Budget } from '../schema';

export async function getBudgets(): Promise<Budget[]> {
  try {
    const results = await db.select()
      .from(budgetsTable)
      .execute();

    // Convert numeric fields back to numbers and handle date conversions
    return results.map(budget => ({
      ...budget,
      amount: budget.amount, // Already an integer in cents
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null,
      created_at: budget.created_at,
      updated_at: budget.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    throw error;
  }
}