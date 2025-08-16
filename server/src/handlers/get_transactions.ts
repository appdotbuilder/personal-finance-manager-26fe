import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction, type TransactionFilter } from '../schema';
import { eq, and, gte, lte, type SQL } from 'drizzle-orm';

export async function getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter) {
      // Filter by transaction type
      if (filter.type) {
        conditions.push(eq(transactionsTable.type, filter.type));
      }

      // Filter by category ID
      if (filter.category_id !== undefined) {
        conditions.push(eq(transactionsTable.category_id, filter.category_id));
      }

      // Filter by start date - convert Date to string for database
      if (filter.start_date) {
        const startDateStr = filter.start_date.toISOString().split('T')[0];
        conditions.push(gte(transactionsTable.date, startDateStr));
      }

      // Filter by end date - convert Date to string for database
      if (filter.end_date) {
        const endDateStr = filter.end_date.toISOString().split('T')[0];
        conditions.push(lte(transactionsTable.date, endDateStr));
      }
    }

    // Build and execute query with or without where clause
    const results = conditions.length > 0
      ? await db.select()
          .from(transactionsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(transactionsTable)
          .execute();

    // Convert string dates back to Date objects and ensure proper types
    return results.map(transaction => ({
      ...transaction,
      date: new Date(transaction.date), // Convert string date to Date object
      created_at: transaction.created_at, // timestamp columns are already Date objects
      updated_at: transaction.updated_at   // timestamp columns are already Date objects
    }));
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
}