import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteBudget(id: number): Promise<boolean> {
  try {
    // Delete the budget with the specified ID
    const result = await db.delete(budgetsTable)
      .where(eq(budgetsTable.id, id))
      .returning()
      .execute();

    // Return true if a budget was actually deleted
    return result.length > 0;
  } catch (error) {
    console.error('Budget deletion failed:', error);
    throw error;
  }
}