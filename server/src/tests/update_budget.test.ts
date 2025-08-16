import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, categoriesTable } from '../db/schema';
import { type UpdateBudgetInput, type CreateCategoryInput } from '../schema';
import { updateBudget } from '../handlers/update_budget';
import { eq } from 'drizzle-orm';

// Test category input
const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  color: '#FF5733',
  icon: '🏠'
};

const secondTestCategory: CreateCategoryInput = {
  name: 'Second Category',
  color: '#33FF57',
  icon: '🚗'
};

// Helper function to create a test category
const createTestCategory = async (categoryData: CreateCategoryInput) => {
  const result = await db.insert(categoriesTable)
    .values({
      name: categoryData.name,
      color: categoryData.color,
      icon: categoryData.icon
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create a test budget
const createTestBudget = async (categoryId: number) => {
  const result = await db.insert(budgetsTable)
    .values({
      category_id: categoryId,
      amount: 50000, // $500.00 in cents
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    })
    .returning()
    .execute();
  return {
    ...result[0],
    // Convert date strings back to Date objects for consistent testing
    start_date: new Date(result[0].start_date),
    end_date: result[0].end_date ? new Date(result[0].end_date) : null,
    created_at: new Date(result[0].created_at),
    updated_at: new Date(result[0].updated_at)
  };
};

describe('updateBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update budget amount', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      amount: 75000 // $750.00 in cents
    };

    const result = await updateBudget(updateInput);

    // Verify response
    expect(result.id).toEqual(budget.id);
    expect(result.amount).toEqual(75000);
    expect(result.category_id).toEqual(category.id);
    expect(result.period).toEqual('monthly');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > budget.updated_at).toBe(true);
  });

  it('should update budget period', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      period: 'weekly'
    };

    const result = await updateBudget(updateInput);

    // Verify response
    expect(result.id).toEqual(budget.id);
    expect(result.period).toEqual('weekly');
    expect(result.amount).toEqual(50000); // Should remain unchanged
    expect(result.category_id).toEqual(category.id);
  });

  it('should update budget category', async () => {
    // Create prerequisite data
    const category1 = await createTestCategory(testCategory);
    const category2 = await createTestCategory(secondTestCategory);
    const budget = await createTestBudget(category1.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: category2.id
    };

    const result = await updateBudget(updateInput);

    // Verify response
    expect(result.id).toEqual(budget.id);
    expect(result.category_id).toEqual(category2.id);
    expect(result.amount).toEqual(50000); // Should remain unchanged
    expect(result.period).toEqual('monthly'); // Should remain unchanged
  });

  it('should update budget dates', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    const newStartDate = new Date('2024-03-01');
    const newEndDate = new Date('2024-09-30');

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      start_date: newStartDate,
      end_date: newEndDate
    };

    const result = await updateBudget(updateInput);

    // Verify response
    expect(result.id).toEqual(budget.id);
    expect(result.start_date).toEqual(newStartDate);
    expect(result.end_date).toEqual(newEndDate);
    expect(result.amount).toEqual(50000); // Should remain unchanged
    expect(result.category_id).toEqual(category.id); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    // Create prerequisite data
    const category1 = await createTestCategory(testCategory);
    const category2 = await createTestCategory(secondTestCategory);
    const budget = await createTestBudget(category1.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: category2.id,
      amount: 100000, // $1000.00 in cents
      period: 'yearly',
      start_date: new Date('2024-01-01'),
      end_date: null // Make it ongoing
    };

    const result = await updateBudget(updateInput);

    // Verify all fields updated
    expect(result.id).toEqual(budget.id);
    expect(result.category_id).toEqual(category2.id);
    expect(result.amount).toEqual(100000);
    expect(result.period).toEqual('yearly');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      amount: 60000 // $600.00 in cents
    };

    await updateBudget(updateInput);

    // Query database to verify changes
    const updatedBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budget.id))
      .execute();

    expect(updatedBudgets).toHaveLength(1);
    const updatedBudget = updatedBudgets[0];
    expect(updatedBudget.amount).toEqual(60000);
    expect(new Date(updatedBudget.updated_at)).toBeInstanceOf(Date);
    expect(new Date(updatedBudget.updated_at) > budget.updated_at).toBe(true);
  });

  it('should throw error when budget not found', async () => {
    const updateInput: UpdateBudgetInput = {
      id: 999, // Non-existent budget
      amount: 50000
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/Budget with id 999 not found/i);
  });

  it('should throw error when category not found', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      category_id: 999 // Non-existent category
    };

    await expect(updateBudget(updateInput)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create prerequisite data
    const category = await createTestCategory(testCategory);
    const budget = await createTestBudget(category.id);

    // Only update one field
    const updateInput: UpdateBudgetInput = {
      id: budget.id,
      period: 'weekly'
    };

    const result = await updateBudget(updateInput);

    // Verify only the specified field changed, others remain the same
    expect(result.id).toEqual(budget.id);
    expect(result.period).toEqual('weekly');
    expect(result.amount).toEqual(budget.amount);
    expect(result.category_id).toEqual(budget.category_id);
    expect(result.start_date).toEqual(budget.start_date);
    expect(result.end_date).toEqual(budget.end_date);
    expect(result.created_at).toEqual(budget.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > budget.updated_at).toBe(true);
  });
});