import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { getBudgets } from '../handlers/get_budgets';

describe('getBudgets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no budgets exist', async () => {
    const result = await getBudgets();
    expect(result).toEqual([]);
  });

  it('should fetch all budgets from database', async () => {
    // Create test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Food',
        color: '#FF5733',
        icon: '🍔'
      })
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create test budgets
    await db.insert(budgetsTable)
      .values([
        {
          category_id: categoryId,
          amount: 50000, // $500.00 in cents
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        },
        {
          category_id: categoryId,
          amount: 30000, // $300.00 in cents
          period: 'weekly',
          start_date: '2024-01-01',
          end_date: null // Ongoing budget
        }
      ])
      .execute();

    const result = await getBudgets();

    expect(result).toHaveLength(2);
    
    // Check first budget
    const budget1 = result.find(b => b.amount === 50000);
    expect(budget1).toBeDefined();
    expect(budget1!.category_id).toEqual(categoryId);
    expect(budget1!.period).toEqual('monthly');
    expect(budget1!.start_date).toBeInstanceOf(Date);
    expect(budget1!.start_date.toISOString().split('T')[0]).toEqual('2024-01-01');
    expect(budget1!.end_date).toBeInstanceOf(Date);
    expect(budget1!.end_date!.toISOString().split('T')[0]).toEqual('2024-12-31');
    expect(budget1!.created_at).toBeInstanceOf(Date);
    expect(budget1!.updated_at).toBeInstanceOf(Date);

    // Check second budget
    const budget2 = result.find(b => b.amount === 30000);
    expect(budget2).toBeDefined();
    expect(budget2!.category_id).toEqual(categoryId);
    expect(budget2!.period).toEqual('weekly');
    expect(budget2!.start_date).toBeInstanceOf(Date);
    expect(budget2!.end_date).toBeNull();
    expect(budget2!.created_at).toBeInstanceOf(Date);
    expect(budget2!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different budget periods correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Entertainment',
        color: '#9B59B6',
        icon: '🎮'
      })
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create budgets with different periods
    await db.insert(budgetsTable)
      .values([
        {
          category_id: categoryId,
          amount: 10000, // Weekly budget
          period: 'weekly',
          start_date: '2024-01-01',
          end_date: null
        },
        {
          category_id: categoryId,
          amount: 40000, // Monthly budget
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: null
        },
        {
          category_id: categoryId,
          amount: 500000, // Yearly budget
          period: 'yearly',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      ])
      .execute();

    const result = await getBudgets();

    expect(result).toHaveLength(3);
    
    const periods = result.map(b => b.period).sort();
    expect(periods).toEqual(['monthly', 'weekly', 'yearly']);

    // Verify amounts are correct integers (in cents)
    const amounts = result.map(b => b.amount).sort();
    expect(amounts).toEqual([10000, 40000, 500000]);
  });

  it('should handle multiple categories with budgets', async () => {
    // Create multiple test categories
    const categories = await db.insert(categoriesTable)
      .values([
        {
          name: 'Food',
          color: '#E74C3C',
          icon: '🍔'
        },
        {
          name: 'Transport',
          color: '#3498DB',
          icon: '🚗'
        }
      ])
      .returning()
      .execute();

    // Create budgets for different categories
    await db.insert(budgetsTable)
      .values([
        {
          category_id: categories[0].id,
          amount: 50000,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: null
        },
        {
          category_id: categories[1].id,
          amount: 20000,
          period: 'weekly',
          start_date: '2024-01-01',
          end_date: null
        }
      ])
      .execute();

    const result = await getBudgets();

    expect(result).toHaveLength(2);
    
    const categoryIds = result.map(b => b.category_id).sort();
    expect(categoryIds).toEqual([categories[0].id, categories[1].id].sort());
  });

  it('should preserve budget ID and timestamps', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Health',
        color: '#2ECC71',
        icon: '💊'
      })
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create budget and capture the created record
    const budgetResult = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 25000,
        period: 'monthly',
        start_date: '2024-06-01',
        end_date: '2024-06-30'
      })
      .returning()
      .execute();

    const createdBudget = budgetResult[0];

    const result = await getBudgets();

    expect(result).toHaveLength(1);
    const fetchedBudget = result[0];
    
    // Verify ID is preserved
    expect(fetchedBudget.id).toEqual(createdBudget.id);
    expect(typeof fetchedBudget.id).toBe('number');
    
    // Verify timestamps are preserved and are Date objects
    expect(fetchedBudget.created_at).toBeInstanceOf(Date);
    expect(fetchedBudget.updated_at).toBeInstanceOf(Date);
    expect(fetchedBudget.created_at.getTime()).toEqual(createdBudget.created_at.getTime());
    expect(fetchedBudget.updated_at.getTime()).toEqual(createdBudget.updated_at.getTime());
  });
});