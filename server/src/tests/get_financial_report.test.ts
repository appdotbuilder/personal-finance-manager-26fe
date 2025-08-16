import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type DateRange, type CreateCategoryInput, type CreateTransactionInput } from '../schema';
import { getFinancialReport } from '../handlers/get_financial_report';

// Test data setup
const testCategory: CreateCategoryInput = {
  name: 'Food',
  color: '#FF5733',
  icon: '🍔'
};

const testCategory2: CreateCategoryInput = {
  name: 'Transportation',
  color: '#33FF57',
  icon: '🚗'
};

describe('getFinancialReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate empty report when no transactions exist', async () => {
    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
    expect(result.expense_by_category).toHaveLength(0);
    expect(result.period).toEqual(dateRange);
  });

  it('should calculate totals correctly with mixed transactions', async () => {
    // Create categories first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        color: testCategory.color,
        icon: testCategory.icon
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    const categoryResult2 = await db.insert(categoriesTable)
      .values({
        name: testCategory2.name,
        color: testCategory2.color,
        icon: testCategory2.icon
      })
      .returning()
      .execute();

    const categoryId2 = categoryResult2[0].id;

    // Create test transactions
    const testTransactions: CreateTransactionInput[] = [
      {
        amount: 5000, // $50.00 income
        description: 'Salary',
        type: 'income',
        category_id: null,
        date: new Date('2024-01-15')
      },
      {
        amount: 2000, // $20.00 expense - Food
        description: 'Lunch',
        type: 'expense',
        category_id: categoryId,
        date: new Date('2024-01-16')
      },
      {
        amount: 1500, // $15.00 expense - Transportation
        description: 'Bus fare',
        type: 'expense',
        category_id: categoryId2,
        date: new Date('2024-01-17')
      },
      {
        amount: 3000, // $30.00 income
        description: 'Freelance',
        type: 'income',
        category_id: null,
        date: new Date('2024-01-18')
      }
    ];

    for (const transaction of testTransactions) {
      await db.insert(transactionsTable)
        .values({
          amount: transaction.amount,
          description: transaction.description,
          type: transaction.type,
          category_id: transaction.category_id,
          date: transaction.date.toISOString().split('T')[0]
        })
        .execute();
    }

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_income).toEqual(8000); // 5000 + 3000
    expect(result.total_expenses).toEqual(3500); // 2000 + 1500
    expect(result.net_income).toEqual(4500); // 8000 - 3500
    expect(result.expense_by_category).toHaveLength(2);
    expect(result.period).toEqual(dateRange);

    // Check expense breakdown by category
    const foodExpense = result.expense_by_category.find(e => e.category_id === categoryId);
    expect(foodExpense).toBeDefined();
    expect(foodExpense?.category_name).toEqual('Food');
    expect(foodExpense?.total_amount).toEqual(2000);

    const transportExpense = result.expense_by_category.find(e => e.category_id === categoryId2);
    expect(transportExpense).toBeDefined();
    expect(transportExpense?.category_name).toEqual('Transportation');
    expect(transportExpense?.total_amount).toEqual(1500);
  });

  it('should handle uncategorized expenses correctly', async () => {
    // Create transaction without category
    const testTransaction: CreateTransactionInput = {
      amount: 1000, // $10.00 expense
      description: 'Miscellaneous',
      type: 'expense',
      category_id: null,
      date: new Date('2024-01-15')
    };

    await db.insert(transactionsTable)
      .values({
        amount: testTransaction.amount,
        description: testTransaction.description,
        type: testTransaction.type,
        category_id: testTransaction.category_id,
        date: testTransaction.date.toISOString().split('T')[0]
      })
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_expenses).toEqual(1000);
    expect(result.expense_by_category).toHaveLength(1);
    expect(result.expense_by_category[0].category_id).toBeNull();
    expect(result.expense_by_category[0].category_name).toBeNull();
    expect(result.expense_by_category[0].total_amount).toEqual(1000);
  });

  it('should filter transactions by date range correctly', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        color: testCategory.color,
        icon: testCategory.icon
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create transactions across different dates
    const transactions = [
      {
        amount: 1000,
        description: 'Outside range - before',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2023-12-31'
      },
      {
        amount: 2000,
        description: 'Inside range',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2024-01-15'
      },
      {
        amount: 3000,
        description: 'Outside range - after',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2024-02-01'
      }
    ];

    for (const transaction of transactions) {
      await db.insert(transactionsTable)
        .values(transaction)
        .execute();
    }

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialReport(dateRange);

    // Should only include the transaction from 2024-01-15
    expect(result.total_expenses).toEqual(2000);
    expect(result.expense_by_category).toHaveLength(1);
    expect(result.expense_by_category[0].total_amount).toEqual(2000);
  });

  it('should handle date range with only start date', async () => {
    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        amount: 1500,
        description: 'Test expense',
        type: 'expense',
        category_id: null,
        date: '2024-01-15'
      })
      .execute();

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01')
      // No end_date
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_expenses).toEqual(1500);
    expect(result.period).toEqual(dateRange);
  });

  it('should handle date range with only end date', async () => {
    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        amount: 2500,
        description: 'Test income',
        type: 'income',
        category_id: null,
        date: '2024-01-15'
      })
      .execute();

    const dateRange: DateRange = {
      end_date: new Date('2024-01-31')
      // No start_date
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_income).toEqual(2500);
    expect(result.period).toEqual(dateRange);
  });

  it('should handle empty date range (no filters)', async () => {
    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        amount: 1000,
        description: 'Test transaction',
        type: 'income',
        category_id: null,
        date: '2024-01-15'
      })
      .execute();

    const dateRange: DateRange = {};

    const result = await getFinancialReport(dateRange);

    expect(result.total_income).toEqual(1000);
    expect(result.period).toEqual(dateRange);
  });

  it('should aggregate multiple transactions in same category', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        color: testCategory.color,
        icon: testCategory.icon
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple transactions in same category
    const transactions = [
      {
        amount: 1000,
        description: 'Breakfast',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2024-01-10'
      },
      {
        amount: 1500,
        description: 'Lunch',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2024-01-15'
      },
      {
        amount: 2000,
        description: 'Dinner',
        type: 'expense' as const,
        category_id: categoryId,
        date: '2024-01-20'
      }
    ];

    for (const transaction of transactions) {
      await db.insert(transactionsTable)
        .values(transaction)
        .execute();
    }

    const dateRange: DateRange = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getFinancialReport(dateRange);

    expect(result.total_expenses).toEqual(4500); // 1000 + 1500 + 2000
    expect(result.expense_by_category).toHaveLength(1);
    expect(result.expense_by_category[0].category_name).toEqual('Food');
    expect(result.expense_by_category[0].total_amount).toEqual(4500);
  });
});