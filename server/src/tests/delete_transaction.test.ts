import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete existing transaction and return true', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        icon: '🏠'
      })
      .returning()
      .execute();

    // Create a test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: 5000, // $50.00 in cents
        description: 'Test transaction',
        type: 'expense',
        category_id: categoryResult[0].id,
        date: '2024-01-15'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Delete the transaction
    const result = await deleteTransaction(transactionId);

    // Should return true indicating successful deletion
    expect(result).toBe(true);

    // Verify transaction no longer exists in database
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(remainingTransactions).toHaveLength(0);
  });

  it('should return false when transaction does not exist', async () => {
    // Try to delete a non-existent transaction
    const result = await deleteTransaction(999999);

    // Should return false indicating no deletion occurred
    expect(result).toBe(false);
  });

  it('should delete transaction without category and return true', async () => {
    // Create a transaction without a category (null category_id)
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: 2500, // $25.00 in cents
        description: 'Uncategorized transaction',
        type: 'income',
        category_id: null,
        date: '2024-01-20'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Delete the uncategorized transaction
    const result = await deleteTransaction(transactionId);

    // Should return true
    expect(result).toBe(true);

    // Verify transaction is deleted
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(remainingTransactions).toHaveLength(0);
  });

  it('should only delete the specified transaction', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#00FF00',
        icon: '💰'
      })
      .returning()
      .execute();

    // Create multiple transactions
    const transaction1Result = await db.insert(transactionsTable)
      .values({
        amount: 1000,
        description: 'Transaction 1',
        type: 'expense',
        category_id: categoryResult[0].id,
        date: '2024-01-10'
      })
      .returning()
      .execute();

    const transaction2Result = await db.insert(transactionsTable)
      .values({
        amount: 2000,
        description: 'Transaction 2',
        type: 'income',
        category_id: categoryResult[0].id,
        date: '2024-01-11'
      })
      .returning()
      .execute();

    const transaction1Id = transaction1Result[0].id;
    const transaction2Id = transaction2Result[0].id;

    // Delete only the first transaction
    const result = await deleteTransaction(transaction1Id);

    expect(result).toBe(true);

    // Verify first transaction is deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction1Id))
      .execute();

    expect(deletedTransaction).toHaveLength(0);

    // Verify second transaction still exists
    const remainingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction2Id))
      .execute();

    expect(remainingTransaction).toHaveLength(1);
    expect(remainingTransaction[0].description).toBe('Transaction 2');
  });

  it('should handle deletion of transaction with zero amount', async () => {
    // Create a transaction with zero amount (edge case)
    const transactionResult = await db.insert(transactionsTable)
      .values({
        amount: 0,
        description: 'Zero amount transaction',
        type: 'expense',
        category_id: null,
        date: '2024-01-25'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Delete the zero amount transaction
    const result = await deleteTransaction(transactionId);

    expect(result).toBe(true);

    // Verify deletion
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(remainingTransactions).toHaveLength(0);
  });
});