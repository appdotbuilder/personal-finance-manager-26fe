import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type UpdateBudgetInput, type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const updateBudget = async (input: UpdateBudgetInput): Promise<Budget> => {
  try {
    // First, verify the budget exists
    const existingBudget = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, input.id))
      .execute();

    if (existingBudget.length === 0) {
      throw new Error(`Budget with id ${input.id} not found`);
    }

    // If category_id is being updated, verify the category exists
    if (input.category_id !== undefined) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (category.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount;
    }
    if (input.period !== undefined) {
      updateData.period = input.period;
    }
    if (input.start_date !== undefined) {
      updateData.start_date = input.start_date;
    }
    if (input.end_date !== undefined) {
      updateData.end_date = input.end_date;
    }

    // Update the budget
    const result = await db.update(budgetsTable)
      .set(updateData)
      .where(eq(budgetsTable.id, input.id))
      .returning()
      .execute();

    const budget = result[0];
    return {
      ...budget,
      // Convert date strings back to Date objects
      start_date: new Date(budget.start_date),
      end_date: budget.end_date ? new Date(budget.end_date) : null,
      created_at: new Date(budget.created_at),
      updated_at: new Date(budget.updated_at)
    };
  } catch (error) {
    console.error('Budget update failed:', error);
    throw error;
  }
};