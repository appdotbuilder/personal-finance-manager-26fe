import { db } from '../db';
import { categoriesTable, transactionsTable, budgetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCategory(id: number): Promise<boolean> {
  try {
    // First, check if the category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    if (existingCategory.length === 0) {
      return false; // Category not found
    }

    // Remove category references from transactions (set to null)
    await db.update(transactionsTable)
      .set({ category_id: null })
      .where(eq(transactionsTable.category_id, id))
      .execute();

    // Delete associated budgets
    await db.delete(budgetsTable)
      .where(eq(budgetsTable.category_id, id))
      .execute();

    // Finally, delete the category
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}