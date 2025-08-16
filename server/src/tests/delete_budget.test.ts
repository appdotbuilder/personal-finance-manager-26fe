import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteBudget } from '../handlers/delete_budget';

describe('deleteBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a budget that exists', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Groceries',
        color: '#FF5733',
        icon: '🛒'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a budget
    const budgetResult = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 50000, // $500.00 in cents
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify budget is deleted from database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();

    expect(budgets).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent budget', async () => {
    const nonExistentId = 99999;

    // Try to delete a budget that doesn't exist
    const result = await deleteBudget(nonExistentId);

    // Should return false since no budget was deleted
    expect(result).toBe(false);
  });

  it('should not affect other budgets when deleting one budget', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Entertainment',
        color: '#33FF57',
        icon: '🎬'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create two budgets
    const budget1Result = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 30000, // $300.00 in cents
        period: 'monthly',
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const budget2Result = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 40000, // $400.00 in cents
        period: 'weekly',
        start_date: '2024-01-01'
      })
      .returning()
      .execute();

    const budget1Id = budget1Result[0].id;
    const budget2Id = budget2Result[0].id;

    // Delete only the first budget
    const result = await deleteBudget(budget1Id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify first budget is deleted
    const deletedBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget1Id))
      .execute();

    expect(deletedBudgets).toHaveLength(0);

    // Verify second budget still exists
    const remainingBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget2Id))
      .execute();

    expect(remainingBudgets).toHaveLength(1);
    expect(remainingBudgets[0].amount).toEqual(40000);
    expect(remainingBudgets[0].period).toEqual('weekly');
  });

  it('should handle deleting budget with different periods correctly', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Travel',
        color: '#5733FF',
        icon: '✈️'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a yearly budget
    const budgetResult = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 120000, // $1200.00 in cents
        period: 'yearly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();

    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify budget is completely removed
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();

    expect(budgets).toHaveLength(0);
  });
});