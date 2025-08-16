import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Validate category exists if category_id is provided
    if (input.category_id !== null) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();
      
      if (categories.length === 0) {
        throw new Error(`Category with id ${input.category_id} does not exist`);
      }
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        amount: input.amount, // Integer column - no conversion needed
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        date: input.date.toISOString().split('T')[0] // Convert Date to date string
      })
      .returning()
      .execute();

    const transaction = result[0];
    return {
      ...transaction,
      date: new Date(transaction.date), // Convert date string back to Date
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};