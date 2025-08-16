import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type TransactionFilter } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test category
  const createTestCategory = async () => {
    const result = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        icon: '🏠'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test transaction
  const createTestTransaction = async (overrides = {}) => {
    const category = await createTestCategory();
    const result = await db.insert(transactionsTable)
      .values({
        amount: 2500, // $25.00 in cents
        description: 'Test Transaction',
        type: 'expense',
        category_id: category.id,
        date: '2024-01-15', // Use string date for database
        ...overrides
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should return all transactions when no filter is provided', async () => {
    // Create test transactions
    await createTestTransaction({ amount: 1000, description: 'Transaction 1' });
    await createTestTransaction({ amount: 2000, description: 'Transaction 2' });

    const result = await getTransactions();

    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(1000);
    expect(result[1].amount).toBe(2000);
    expect(result[0].description).toBe('Transaction 1');
    expect(result[1].description).toBe('Transaction 2');
  });

  it('should filter transactions by type', async () => {
    // Create income and expense transactions
    await createTestTransaction({ type: 'income', amount: 5000, description: 'Income' });
    await createTestTransaction({ type: 'expense', amount: 3000, description: 'Expense' });

    const filter: TransactionFilter = { type: 'income' };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('income');
    expect(result[0].description).toBe('Income');
    expect(result[0].amount).toBe(5000);
  });

  it('should filter transactions by category_id', async () => {
    const category1 = await createTestCategory();
    const category2 = await db.insert(categoriesTable)
      .values({
        name: 'Category 2',
        color: '#00FF00',
        icon: '💰'
      })
      .returning()
      .execute();

    // Create transactions with different categories
    await db.insert(transactionsTable)
      .values({
        amount: 1500,
        description: 'Category 1 Transaction',
        type: 'expense',
        category_id: category1.id,
        date: '2024-01-15'
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        amount: 2500,
        description: 'Category 2 Transaction',
        type: 'expense',
        category_id: category2[0].id,
        date: '2024-01-15'
      })
      .execute();

    const filter: TransactionFilter = { category_id: category1.id };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(category1.id);
    expect(result[0].description).toBe('Category 1 Transaction');
    expect(result[0].amount).toBe(1500);
  });

  it('should filter transactions by date range', async () => {
    // Create transactions with different dates
    await createTestTransaction({ 
      date: '2024-01-10', 
      description: 'Before range' 
    });
    await createTestTransaction({ 
      date: '2024-01-15', 
      description: 'In range' 
    });
    await createTestTransaction({ 
      date: '2024-01-20', 
      description: 'In range 2' 
    });
    await createTestTransaction({ 
      date: '2024-01-25', 
      description: 'After range' 
    });

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-22')
    };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(2);
    expect(result.map(t => t.description)).toContain('In range');
    expect(result.map(t => t.description)).toContain('In range 2');
    expect(result.map(t => t.description)).not.toContain('Before range');
    expect(result.map(t => t.description)).not.toContain('After range');
  });

  it('should filter by start_date only', async () => {
    await createTestTransaction({ 
      date: '2024-01-10', 
      description: 'Before start' 
    });
    await createTestTransaction({ 
      date: '2024-01-20', 
      description: 'After start' 
    });

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-15')
    };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('After start');
  });

  it('should filter by end_date only', async () => {
    await createTestTransaction({ 
      date: '2024-01-10', 
      description: 'Before end' 
    });
    await createTestTransaction({ 
      date: '2024-01-20', 
      description: 'After end' 
    });

    const filter: TransactionFilter = {
      end_date: new Date('2024-01-15')
    };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Before end');
  });

  it('should apply multiple filters simultaneously', async () => {
    const category = await createTestCategory();
    
    // Create various transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: 1000,
          description: 'Income in category',
          type: 'income',
          category_id: category.id,
          date: '2024-01-15'
        },
        {
          amount: 2000,
          description: 'Expense in category',
          type: 'expense',
          category_id: category.id,
          date: '2024-01-15'
        },
        {
          amount: 3000,
          description: 'Income different category',
          type: 'income',
          category_id: null, // Uncategorized
          date: '2024-01-15'
        },
        {
          amount: 4000,
          description: 'Income in category different date',
          type: 'income',
          category_id: category.id,
          date: '2024-02-15'
        }
      ])
      .execute();

    const filter: TransactionFilter = {
      type: 'income',
      category_id: category.id,
      start_date: new Date('2024-01-10'),
      end_date: new Date('2024-01-20')
    };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Income in category');
    expect(result[0].type).toBe('income');
    expect(result[0].category_id).toBe(category.id);
    expect(result[0].amount).toBe(1000);
  });

  it('should handle transactions with null category_id', async () => {
    // Create transaction without category
    await db.insert(transactionsTable)
      .values({
        amount: 1500,
        description: 'Uncategorized Transaction',
        type: 'expense',
        category_id: null,
        date: '2024-01-15'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBeNull();
    expect(result[0].description).toBe('Uncategorized Transaction');
    expect(result[0].amount).toBe(1500);
  });

  it('should return transactions with correct date types', async () => {
    await createTestTransaction();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when filters match no transactions', async () => {
    await createTestTransaction({ type: 'expense' });

    const filter: TransactionFilter = { type: 'income' };
    const result = await getTransactions(filter);

    expect(result).toEqual([]);
  });

  it('should correctly convert date values between database and response format', async () => {
    // Insert with string date
    await createTestTransaction({ date: '2024-01-15' });

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[0].date.getFullYear()).toBe(2024);
    expect(result[0].date.getMonth()).toBe(0); // January is 0
    expect(result[0].date.getDate()).toBe(15);
  });

  it('should handle edge case date filtering correctly', async () => {
    // Create transactions on exact boundary dates
    await createTestTransaction({ 
      date: '2024-01-15', 
      description: 'Exact start date' 
    });
    await createTestTransaction({ 
      date: '2024-01-20', 
      description: 'Exact end date' 
    });

    const filter: TransactionFilter = {
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-20')
    };
    const result = await getTransactions(filter);

    expect(result).toHaveLength(2);
    expect(result.map(t => t.description)).toContain('Exact start date');
    expect(result.map(t => t.description)).toContain('Exact end date');
  });
});