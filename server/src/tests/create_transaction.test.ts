import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test category for foreign key tests
const testCategory = {
  name: 'Test Category',
  color: '#FF5733',
  icon: '💰'
};

// Test transaction inputs
const incomeTransactionInput: CreateTransactionInput = {
  amount: 50000, // $500.00 in cents
  description: 'Salary payment',
  type: 'income',
  category_id: null,
  date: new Date('2024-01-15')
};

const expenseTransactionInput: CreateTransactionInput = {
  amount: 2500, // $25.00 in cents
  description: 'Coffee purchase',
  type: 'expense',
  category_id: 1, // Will be set after creating category
  date: new Date('2024-01-16')
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an income transaction without category', async () => {
    const result = await createTransaction(incomeTransactionInput);

    // Basic field validation
    expect(result.amount).toEqual(50000);
    expect(result.description).toEqual('Salary payment');
    expect(result.type).toEqual('income');
    expect(result.category_id).toBeNull();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().split('T')[0]).toEqual('2024-01-15');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an expense transaction with category', async () => {
    // First create a category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Update input with actual category ID
    const inputWithCategory = {
      ...expenseTransactionInput,
      category_id: categoryId
    };

    const result = await createTransaction(inputWithCategory);

    // Validation
    expect(result.amount).toEqual(2500);
    expect(result.description).toEqual('Coffee purchase');
    expect(result.type).toEqual('expense');
    expect(result.category_id).toEqual(categoryId);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().split('T')[0]).toEqual('2024-01-16');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const result = await createTransaction(incomeTransactionInput);

    // Query database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    expect(savedTransaction.amount).toEqual(50000);
    expect(savedTransaction.description).toEqual('Salary payment');
    expect(savedTransaction.type).toEqual('income');
    expect(savedTransaction.category_id).toBeNull();
    expect(savedTransaction.date).toEqual('2024-01-15');
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
    expect(savedTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should handle date conversion correctly', async () => {
    const testDate = new Date('2024-03-20T14:30:00Z');
    const inputWithDate = {
      ...incomeTransactionInput,
      date: testDate
    };

    const result = await createTransaction(inputWithDate);

    // Verify date is stored and returned correctly (date portion only)
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().split('T')[0]).toEqual('2024-03-20');

    // Check database storage
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions[0].date).toEqual('2024-03-20');
  });

  it('should reject transaction with non-existent category', async () => {
    const inputWithInvalidCategory = {
      ...expenseTransactionInput,
      category_id: 999 // Non-existent category ID
    };

    await expect(createTransaction(inputWithInvalidCategory))
      .rejects.toThrow(/Category with id 999 does not exist/i);
  });

  it('should handle large amounts correctly', async () => {
    const largeAmountInput = {
      ...incomeTransactionInput,
      amount: 1000000, // $10,000.00 in cents
      description: 'Large bonus payment'
    };

    const result = await createTransaction(largeAmountInput);

    expect(result.amount).toEqual(1000000);
    expect(typeof result.amount).toEqual('number');

    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions[0].amount).toEqual(1000000);
  });

  it('should create multiple transactions independently', async () => {
    // Create first transaction
    const result1 = await createTransaction(incomeTransactionInput);

    // Create second transaction
    const result2 = await createTransaction({
      ...incomeTransactionInput,
      amount: 30000,
      description: 'Second income',
      date: new Date('2024-01-17')
    });

    // Verify both exist and are different
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.amount).toEqual(50000);
    expect(result2.amount).toEqual(30000);

    // Check database has both
    const allTransactions = await db.select()
      .from(transactionsTable)
      .execute();

    expect(allTransactions).toHaveLength(2);
  });
});