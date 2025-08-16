import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Food & Dining',
  color: '#FF5733',
  icon: '🍔'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Food & Dining');
    expect(result.color).toEqual('#FF5733');
    expect(result.icon).toEqual('🍔');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Food & Dining');
    expect(categories[0].color).toEqual('#FF5733');
    expect(categories[0].icon).toEqual('🍔');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create category with null icon', async () => {
    const inputWithNullIcon: CreateCategoryInput = {
      name: 'Transportation',
      color: '#3498DB',
      icon: null
    };

    const result = await createCategory(inputWithNullIcon);

    expect(result.name).toEqual('Transportation');
    expect(result.color).toEqual('#3498DB');
    expect(result.icon).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories successfully', async () => {
    // Create first category
    const category1 = await createCategory({
      name: 'Entertainment',
      color: '#9B59B6',
      icon: '🎬'
    });

    // Create second category
    const category2 = await createCategory({
      name: 'Healthcare',
      color: '#E74C3C',
      icon: '🏥'
    });

    // Verify both categories exist
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    
    const names = allCategories.map(c => c.name).sort();
    expect(names).toEqual(['Entertainment', 'Healthcare']);
    
    // Verify they have different IDs
    expect(category1.id).not.toEqual(category2.id);
  });

  it('should handle special characters in category name', async () => {
    const specialInput: CreateCategoryInput = {
      name: 'Café & Restaurants',
      color: '#F39C12',
      icon: '☕'
    };

    const result = await createCategory(specialInput);

    expect(result.name).toEqual('Café & Restaurants');
    expect(result.icon).toEqual('☕');
    
    // Verify in database
    const savedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(savedCategory[0].name).toEqual('Café & Restaurants');
    expect(savedCategory[0].icon).toEqual('☕');
  });

  it('should validate hex color format', async () => {
    const validColorInput: CreateCategoryInput = {
      name: 'Utilities',
      color: '#ABCDEF',
      icon: '⚡'
    };

    const result = await createCategory(validColorInput);
    expect(result.color).toEqual('#ABCDEF');

    // Verify lowercase hex works too
    const lowercaseInput: CreateCategoryInput = {
      name: 'Shopping',
      color: '#abcdef',
      icon: '🛒'
    };

    const result2 = await createCategory(lowercaseInput);
    expect(result2.color).toEqual('#abcdef');
  });
});