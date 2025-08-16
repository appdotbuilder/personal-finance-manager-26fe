import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type CreateBudgetInput } from '../schema';
import { createBudget } from '../handlers/create_budget';
import { eq } from 'drizzle-orm';

// Test category for budget creation
const testCategory = {
  name: 'Test Category',
  color: '#FF0000',
  icon: '🛒'
};

// Base test input
const testInput: CreateBudgetInput = {
  category_id: 1, // Will be set after creating category
  amount: 50000, // $500.00 in cents
  period: 'monthly' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

describe('createBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a budget successfully', async () => {
    // First create a category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];
    
    // Create budget with valid category_id
    const input = { ...testInput, category_id: category.id };
    const result = await createBudget(input);

    // Verify basic properties
    expect(result.id).toBeDefined();
    expect(result.category_id).toEqual(category.id);
    expect(result.amount).toEqual(50000);
    expect(result.period).toEqual('monthly');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-12-31'));
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save budget to database correctly', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];
    const input = { ...testInput, category_id: category.id };
    
    const result = await createBudget(input);

    // Query database to verify budget was saved
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets).toHaveLength(1);
    const savedBudget = budgets[0];
    
    expect(savedBudget.category_id).toEqual(category.id);
    expect(savedBudget.amount).toEqual(50000);
    expect(savedBudget.period).toEqual('monthly');
    expect(savedBudget.start_date).toEqual('2024-01-01'); // Date stored as string in DB
    expect(savedBudget.end_date).toEqual('2024-12-31');
    expect(savedBudget.created_at).toBeInstanceOf(Date);
    expect(savedBudget.updated_at).toBeInstanceOf(Date);
  });

  it('should handle budget with null end_date (ongoing budget)', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];
    
    // Create budget without end date
    const input: CreateBudgetInput = {
      category_id: category.id,
      amount: 100000, // $1000.00
      period: 'yearly',
      start_date: new Date('2024-01-01'),
      end_date: null
    };

    const result = await createBudget(input);

    expect(result.end_date).toBeNull();
    expect(result.amount).toEqual(100000);
    expect(result.period).toEqual('yearly');
    
    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets[0].end_date).toBeNull();
  });

  it('should handle different budget periods correctly', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];

    // Test weekly budget
    const weeklyInput: CreateBudgetInput = {
      category_id: category.id,
      amount: 5000, // $50.00 per week
      period: 'weekly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-07')
    };

    const weeklyResult = await createBudget(weeklyInput);
    expect(weeklyResult.period).toEqual('weekly');
    expect(weeklyResult.amount).toEqual(5000);

    // Test monthly budget
    const monthlyInput: CreateBudgetInput = {
      category_id: category.id,
      amount: 20000, // $200.00 per month
      period: 'monthly',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-29')
    };

    const monthlyResult = await createBudget(monthlyInput);
    expect(monthlyResult.period).toEqual('monthly');
    expect(monthlyResult.amount).toEqual(20000);
  });

  it('should throw error when category does not exist', async () => {
    const input: CreateBudgetInput = {
      category_id: 999, // Non-existent category ID
      amount: 10000,
      period: 'monthly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    await expect(createBudget(input)).rejects.toThrow(/Category with id 999 does not exist/i);
  });

  it('should handle large budget amounts correctly', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];

    const input: CreateBudgetInput = {
      category_id: category.id,
      amount: 1000000, // $10,000.00
      period: 'yearly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const result = await createBudget(input);
    expect(result.amount).toEqual(1000000);
    
    // Verify amount is stored correctly as integer
    expect(typeof result.amount).toBe('number');
    expect(Number.isInteger(result.amount)).toBe(true);
  });

  it('should create multiple budgets for same category with different periods', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category = categoryResult[0];

    // Create weekly budget
    const weeklyBudget = await createBudget({
      category_id: category.id,
      amount: 5000,
      period: 'weekly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-07')
    });

    // Create monthly budget for same category
    const monthlyBudget = await createBudget({
      category_id: category.id,
      amount: 20000,
      period: 'monthly',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    });

    expect(weeklyBudget.id).not.toEqual(monthlyBudget.id);
    expect(weeklyBudget.category_id).toEqual(monthlyBudget.category_id);
    expect(weeklyBudget.period).toEqual('weekly');
    expect(monthlyBudget.period).toEqual('monthly');

    // Verify both budgets exist in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.category_id, category.id))
      .execute();

    expect(budgets).toHaveLength(2);
  });
});