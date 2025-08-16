import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  try {
    // First verify the transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // If category_id is provided, verify it exists
    if (input.category_id !== undefined && input.category_id !== null) {
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

    if (input.amount !== undefined) {
      updateData.amount = input.amount;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.date !== undefined) {
      updateData.date = input.date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD string
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert date string back to Date object before returning
    const transaction = result[0];
    return {
      ...transaction,
      date: new Date(transaction.date)
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
}