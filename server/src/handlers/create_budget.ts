import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type CreateBudgetInput, type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  try {
    // First verify that the category exists to prevent foreign key constraint violation
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // Insert budget record
    const result = await db.insert(budgetsTable)
      .values({
        category_id: input.category_id,
        amount: input.amount, // Amount is stored as integer (cents)
        period: input.period,
        start_date: input.start_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        end_date: input.end_date ? input.end_date.toISOString().split('T')[0] : null
      })
      .returning()
      .execute();

    const budget = result[0];
    return {
      ...budget,
      // Convert dates to Date objects if needed (they should already be Date objects from the DB)
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null,
      created_at: new Date(budget.created_at),
      updated_at: new Date(budget.updated_at)
    };
  } catch (error) {
    console.error('Budget creation failed:', error);
    throw error;
  }
};