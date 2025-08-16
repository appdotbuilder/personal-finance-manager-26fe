import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';

export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  try {
    // Insert category record
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        color: input.color,
        icon: input.icon
      })
      .returning()
      .execute();

    const category = result[0];
    return category;
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
};