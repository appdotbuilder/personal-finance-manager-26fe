import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput): Promise<Category> => {
  try {
    // First, verify the category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Partial<{
      name: string;
      color: string;
      icon: string | null;
    }> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.color !== undefined) {
      updateData.color = input.color;
    }
    
    if (input.icon !== undefined) {
      updateData.icon = input.icon;
    }

    // If no fields to update, return existing category
    if (Object.keys(updateData).length === 0) {
      return existingCategory[0];
    }

    // Update the category
    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};