import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTransaction = async (id: number): Promise<boolean> => {
  try {
    // Delete the transaction by ID
    const result = await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    // Check if any rows were affected (transaction existed and was deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
};