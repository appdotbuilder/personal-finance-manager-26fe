import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type CreateCategoryInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testCategory: CreateCategoryInput = {
  name: 'Food',
  color: '#FF5733',
  icon: '🍕'
};

const anotherCategory: CreateCategoryInput = {
  name: 'Transport',
  color: '#3498DB',
  icon: '🚗'
};

const testTransaction = {
  amount: 2500, // $25.00 in cents
  description: 'Lunch at restaurant',
  type: 'expense' as const,
  category_id: null as number | null, // Will be set after creating category
  date: '2024-01-15' // Date as string for database storage
};

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update transaction amount', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      amount: 3000 // Update to $30.00
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.amount).toEqual(3000);
    expect(result.description).toEqual(testTransaction.description); // Should remain unchanged
    expect(result.type).toEqual(testTransaction.type); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction description', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      description: 'Dinner at fancy restaurant'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.description).toEqual('Dinner at fancy restaurant');
    expect(result.amount).toEqual(testTransaction.amount); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction category', async () => {
    // Create categories
    const category1 = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const category2 = await db.insert(categoriesTable)
      .values(anotherCategory)
      .returning()
      .execute();

    // Create transaction with first category
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: category1[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      category_id: category2[0].id
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.category_id).toEqual(category2[0].id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction to uncategorized', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction with category
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      category_id: null
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.category_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction type', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      type: 'income'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.type).toEqual('income');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction date', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const newDate = new Date('2024-02-01');
    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().split('T')[0]).toEqual('2024-02-01');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const newDate = new Date('2024-03-01');
    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      amount: 5000,
      description: 'Updated description',
      type: 'income',
      date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionResult[0].id);
    expect(result.amount).toEqual(5000);
    expect(result.description).toEqual('Updated description');
    expect(result.type).toEqual('income');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.toISOString().split('T')[0]).toEqual('2024-03-01');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      amount: 4500,
      description: 'Verified update'
    };

    await updateTransaction(updateInput);

    // Verify in database
    const dbTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionResult[0].id))
      .execute();

    expect(dbTransaction).toHaveLength(1);
    expect(dbTransaction[0].amount).toEqual(4500);
    expect(dbTransaction[0].description).toEqual('Verified update');
    expect(dbTransaction[0].updated_at).toBeInstanceOf(Date);
    // Updated_at should be different from created_at
    expect(dbTransaction[0].updated_at.getTime()).toBeGreaterThan(dbTransaction[0].created_at.getTime());
  });

  it('should throw error when transaction not found', async () => {
    const updateInput: UpdateTransactionInput = {
      id: 99999, // Non-existent ID
      amount: 1000
    };

    expect(updateTransaction(updateInput)).rejects.toThrow(/transaction with id 99999 not found/i);
  });

  it('should throw error when category not found', async () => {
    // Create transaction without category
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: null
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      category_id: 99999 // Non-existent category ID
    };

    expect(updateTransaction(updateInput)).rejects.toThrow(/category with id 99999 not found/i);
  });

  it('should allow partial updates', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    // Update only one field
    const updateInput: UpdateTransactionInput = {
      id: transactionResult[0].id,
      amount: 7500
    };

    const result = await updateTransaction(updateInput);

    // Verify updated field
    expect(result.amount).toEqual(7500);
    // Verify other fields remain unchanged
    expect(result.description).toEqual(testTransaction.description);
    expect(result.type).toEqual(testTransaction.type);
    expect(result.category_id).toEqual(categoryResult[0].id);
  });
});