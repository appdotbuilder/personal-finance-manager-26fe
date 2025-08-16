import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, budgetsTable, transactionsTable } from '../db/schema';
import { getBudgetStatus } from '../handlers/get_budget_status';

describe('getBudgetStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no budgets exist', async () => {
    const result = await getBudgetStatus();
    expect(result).toEqual([]);
  });

  it('should calculate budget status correctly for active budget', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Food',
        color: '#FF5733',
        icon: '🍕'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budget (monthly, $500 limit) - using current date range
    const budgetAmount = 50000; // $500 in cents
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // First day of current month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]; // Last day of current month
    
    const budgetResult = await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: budgetAmount,
        period: 'monthly',
        start_date: startDate,
        end_date: endDate
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Create some expense transactions within budget period
    await db.insert(transactionsTable)
      .values([
        {
          amount: 15000, // $150
          description: 'Groceries',
          type: 'expense',
          category_id: categoryId,
          date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0]
        },
        {
          amount: 10000, // $100
          description: 'Restaurant',
          type: 'expense',
          category_id: categoryId,
          date: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(1);
    const status = result[0];
    
    expect(status.id).toEqual(budgetId);
    expect(status.category_id).toEqual(categoryId);
    expect(status.category_name).toEqual('Food');
    expect(status.budget_amount).toEqual(50000);
    expect(status.spent_amount).toEqual(25000); // $150 + $100
    expect(status.remaining_amount).toEqual(25000); // $500 - $250
    expect(status.percentage_used).toEqual(50); // 250/500 * 100
    expect(status.period).toEqual('monthly');
    expect(status.start_date).toEqual(new Date(startDate));
    expect(status.end_date).toEqual(new Date(endDate));
    expect(status.is_over_budget).toEqual(false);
  });

  it('should detect over-budget status', async () => {
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

    // Create budget with small limit - current week
    const budgetAmount = 20000; // $200 in cents
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: budgetAmount,
        period: 'weekly',
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0]
      })
      .execute();

    // Create expense that exceeds budget
    await db.insert(transactionsTable)
      .values({
        amount: 35000, // $350 - exceeds $200 budget
        description: 'Concert tickets',
        type: 'expense',
        category_id: categoryId,
        date: today.toISOString().split('T')[0]
      })
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(1);
    const status = result[0];
    
    expect(status.spent_amount).toEqual(35000);
    expect(status.remaining_amount).toEqual(-15000); // Negative remaining
    expect(status.percentage_used).toEqual(175); // 350/200 * 100
    expect(status.is_over_budget).toEqual(true);
  });

  it('should exclude income transactions from spent calculations', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Salary',
        color: '#27AE60',
        icon: '💰'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budget - current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 100000, // $1000
        period: 'monthly',
        start_date: startOfMonth,
        end_date: endOfMonth
      })
      .execute();

    // Create mixed transactions
    await db.insert(transactionsTable)
      .values([
        {
          amount: 50000, // $500 expense
          description: 'Equipment',
          type: 'expense',
          category_id: categoryId,
          date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0]
        },
        {
          amount: 200000, // $2000 income - should be ignored
          description: 'Salary payment',
          type: 'income',
          category_id: categoryId,
          date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(1);
    const status = result[0];
    
    // Should only count expense transactions
    expect(status.spent_amount).toEqual(50000);
    expect(status.percentage_used).toEqual(50);
    expect(status.is_over_budget).toEqual(false);
  });

  it('should handle transactions outside budget date range', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Travel',
        color: '#3498DB',
        icon: '✈️'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create budget for current month
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    await db.insert(budgetsTable)
      .values({
        category_id: categoryId,
        amount: 100000, // $1000
        period: 'monthly',
        start_date: startDate,
        end_date: endDate
      })
      .execute();

    // Create transactions both inside and outside the date range
    await db.insert(transactionsTable)
      .values([
        {
          amount: 30000, // $300 - within range
          description: 'Flight ticket',
          type: 'expense',
          category_id: categoryId,
          date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0]
        },
        {
          amount: 50000, // $500 - before range
          description: 'Hotel booking',
          type: 'expense',
          category_id: categoryId,
          date: new Date(currentYear, currentMonth - 1, 25).toISOString().split('T')[0]
        },
        {
          amount: 25000, // $250 - after range
          description: 'Car rental',
          type: 'expense',
          category_id: categoryId,
          date: new Date(currentYear, currentMonth + 1, 5).toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(1);
    const status = result[0];
    
    // Should only count transaction within the budget period
    expect(status.spent_amount).toEqual(30000);
    expect(status.percentage_used).toEqual(30);
    expect(status.is_over_budget).toEqual(false);
  });

  it('should handle multiple budgets for different categories', async () => {
    // Create multiple categories
    const categories = await db.insert(categoriesTable)
      .values([
        { name: 'Food', color: '#FF5733', icon: '🍕' },
        { name: 'Transport', color: '#2ECC71', icon: '🚗' }
      ])
      .returning()
      .execute();

    // Create budgets for each category - current periods
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Monthly budget for Food
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    
    // Weekly budget for Transport (current week)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    await db.insert(budgetsTable)
      .values([
        {
          category_id: categories[0].id,
          amount: 50000, // $500
          period: 'monthly',
          start_date: monthStart,
          end_date: monthEnd
        },
        {
          category_id: categories[1].id,
          amount: 20000, // $200
          period: 'weekly',
          start_date: startOfWeek.toISOString().split('T')[0],
          end_date: endOfWeek.toISOString().split('T')[0]
        }
      ])
      .execute();

    // Create transactions for both categories
    await db.insert(transactionsTable)
      .values([
        {
          amount: 15000, // $150
          description: 'Groceries',
          type: 'expense',
          category_id: categories[0].id,
          date: new Date(currentYear, currentMonth, 15).toISOString().split('T')[0]
        },
        {
          amount: 8000, // $80
          description: 'Gas',
          type: 'expense',
          category_id: categories[1].id,
          date: today.toISOString().split('T')[0]
        }
      ])
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(2);
    
    // Find results by category name
    const foodBudget = result.find(r => r.category_name === 'Food');
    const transportBudget = result.find(r => r.category_name === 'Transport');

    expect(foodBudget).toBeDefined();
    expect(foodBudget!.spent_amount).toEqual(15000);
    expect(foodBudget!.percentage_used).toEqual(30);

    expect(transportBudget).toBeDefined();
    expect(transportBudget!.spent_amount).toEqual(8000);
    expect(transportBudget!.percentage_used).toEqual(40);
  });

  it('should handle budgets with no transactions', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Shopping',
        color: '#E74C3C',
        icon: '🛍️'
      })
      .returning()
      .execute();

    // Create budget with no associated transactions - current week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    await db.insert(budgetsTable)
      .values({
        category_id: categoryResult[0].id,
        amount: 30000, // $300
        period: 'weekly',
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0]
      })
      .execute();

    const result = await getBudgetStatus();

    expect(result).toHaveLength(1);
    const status = result[0];
    
    expect(status.spent_amount).toEqual(0);
    expect(status.remaining_amount).toEqual(30000);
    expect(status.percentage_used).toEqual(0);
    expect(status.is_over_budget).toEqual(false);
  });
});