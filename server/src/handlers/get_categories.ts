import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all categories from the database
    const results = await db.select()
      .from(categoriesTable)
      .execute();

    // Return the categories - no numeric conversions needed as no numeric columns
    return results;
  } catch (error) {
    console.error('Get categories failed:', error);
    throw error;
  }
};