import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, transactionsTable, budgetsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a category successfully', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF5733',
        icon: '🛒'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify category was deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should return false for non-existent category', async () => {
    const result = await deleteCategory(999);

    expect(result).toBe(false);
  });

  it('should nullify category references in transactions', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Food',
        color: '#FF5733',
        icon: '🍔'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create transactions with this category
    await db.insert(transactionsTable)
      .values([
        {
          amount: 5000, // $50.00
          description: 'Grocery shopping',
          type: 'expense',
          category_id: categoryId,
          date: '2024-01-15'
        },
        {
          amount: 3000, // $30.00
          description: 'Restaurant dinner',
          type: 'expense',
          category_id: categoryId,
          date: '2024-01-16'
        }
      ])
      .execute();

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify transactions have null category_id
    const transactions = await db.select()
      .from(transactionsTable)
      .execute();

    expect(transactions).toHaveLength(2);
    transactions.forEach(transaction => {
      expect(transaction.category_id).toBeNull();
    });
  });

  it('should delete associated budgets', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Entertainment',
        color: '#9B59B6',
        icon: '🎬'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create budgets for this category
    await db.insert(budgetsTable)
      .values([
        {
          category_id: categoryId,
          amount: 20000, // $200.00
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        {
          category_id: categoryId,
          amount: 50000, // $500.00
          period: 'yearly',
          start_date: '2024-01-01',
          end_date: null
        }
      ])
      .execute();

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify budgets were deleted
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.category_id, categoryId))
      .execute();

    expect(budgets).toHaveLength(0);
  });

  it('should handle category with both transactions and budgets', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Transportation',
        color: '#3498DB',
        icon: '🚗'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create transaction with this category
    await db.insert(transactionsTable)
      .values({
        amount: 8000, // $80.00
        description: 'Gas station',
        type: 'expense',
        category_id: categoryId,
        date: '2024-01-15'
      })
      .execute();

    // Create budget for this category
    await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 40000, // $400.00
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: null
      })
      .execute();

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify category was deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);

    // Verify transaction has null category_id
    const transactions = await db.select()
      .from(transactionsTable)
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].category_id).toBeNull();

    // Verify budget was deleted
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.category_id, categoryId))
      .execute();

    expect(budgets).toHaveLength(0);
  });

  it('should not affect other categories and their data', async () => {
    // Create multiple test categories
    const categoryResults = await db.insert(categoriesTable)
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

    const foodCategoryId = categoryResults[0].id;
    const transportCategoryId = categoryResults[1].id;

    // Create transactions for both categories
    await db.insert(transactionsTable)
      .values([
        {
          amount: 2500, // $25.00
          description: 'Lunch',
          type: 'expense',
          category_id: foodCategoryId,
          date: '2024-01-15'
        },
        {
          amount: 5000, // $50.00
          description: 'Gas',
          type: 'expense',
          category_id: transportCategoryId,
          date: '2024-01-16'
        }
      ])
      .execute();

    // Delete only the food category
    const result = await deleteCategory(foodCategoryId);

    expect(result).toBe(true);

    // Verify food category was deleted
    const foodCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, foodCategoryId))
      .execute();

    expect(foodCategory).toHaveLength(0);

    // Verify transport category still exists
    const transportCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, transportCategoryId))
      .execute();

    expect(transportCategory).toHaveLength(1);
    expect(transportCategory[0].name).toBe('Transport');

    // Verify transactions - food transaction should have null category_id
    const transactions = await db.select()
      .from(transactionsTable)
      .execute();

    expect(transactions).toHaveLength(2);

    const lunchTransaction = transactions.find(t => t.description === 'Lunch');
    const gasTransaction = transactions.find(t => t.description === 'Gas');

    expect(lunchTransaction?.category_id).toBeNull();
    expect(gasTransaction?.category_id).toBe(transportCategoryId);
  });
});