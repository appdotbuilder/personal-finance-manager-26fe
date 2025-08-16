import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Test data
const testCategoryData: CreateCategoryInput = {
  name: 'Original Category',
  color: '#FF0000',
  icon: '🛒'
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.icon).toEqual('🛒'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update category color', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      color: '#00FF00'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#00FF00');
    expect(result.icon).toEqual('🛒'); // Should remain unchanged
  });

  it('should update category icon to a new value', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      icon: '🎯'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.icon).toEqual('🎯');
  });

  it('should update category icon to null', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      icon: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.icon).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Multi-Update Category',
      color: '#0000FF',
      icon: '⭐'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Multi-Update Category');
    expect(result.color).toEqual('#0000FF');
    expect(result.icon).toEqual('⭐');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should return unchanged category when no fields provided', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Original Category');
    expect(result.color).toEqual('#FF0000');
    expect(result.icon).toEqual('🛒');
  });

  it('should save changes to database', async () => {
    // Create a category first
    const created = await db.insert(categoriesTable)
      .values(testCategoryData)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Persisted Update',
      color: '#FFFFFF'
    };

    await updateCategory(updateInput);

    // Verify changes were saved to database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Persisted Update');
    expect(categories[0].color).toEqual('#FFFFFF');
    expect(categories[0].icon).toEqual('🛒'); // Should remain unchanged
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Update'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should handle category with null icon correctly', async () => {
    // Create a category with null icon
    const categoryWithNullIcon = {
      name: 'No Icon Category',
      color: '#AAAAAA',
      icon: null
    };

    const created = await db.insert(categoriesTable)
      .values(categoryWithNullIcon)
      .returning()
      .execute();

    const categoryId = created[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated No Icon'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated No Icon');
    expect(result.color).toEqual('#AAAAAA');
    expect(result.icon).toBeNull();
  });
});