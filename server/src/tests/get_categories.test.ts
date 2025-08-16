import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all categories', async () => {
    // Create test categories
    const testCategories = [
      {
        name: 'Food',
        color: '#FF5733',
        icon: '🍔'
      },
      {
        name: 'Transportation',
        color: '#33FF57',
        icon: '🚗'
      },
      {
        name: 'Entertainment',
        color: '#3357FF',
        icon: '🎬'
      }
    ];

    // Insert categories into database
    await db.insert(categoriesTable)
      .values(testCategories)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify all categories are returned with correct structure
    expect(result[0]).toMatchObject({
      id: expect.any(Number),
      name: 'Food',
      color: '#FF5733',
      icon: '🍔',
      created_at: expect.any(Date)
    });

    expect(result[1]).toMatchObject({
      id: expect.any(Number),
      name: 'Transportation',
      color: '#33FF57',
      icon: '🚗',
      created_at: expect.any(Date)
    });

    expect(result[2]).toMatchObject({
      id: expect.any(Number),
      name: 'Entertainment',
      color: '#3357FF',
      icon: '🎬',
      created_at: expect.any(Date)
    });
  });

  it('should handle categories with null icons', async () => {
    // Create category with null icon
    await db.insert(categoriesTable)
      .values({
        name: 'Utilities',
        color: '#FFAA33',
        icon: null
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: expect.any(Number),
      name: 'Utilities',
      color: '#FFAA33',
      icon: null,
      created_at: expect.any(Date)
    });
  });

  it('should return categories in creation order', async () => {
    // Create categories in specific order
    const category1 = await db.insert(categoriesTable)
      .values({
        name: 'First Category',
        color: '#111111',
        icon: '1️⃣'
      })
      .returning()
      .execute();

    const category2 = await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        color: '#222222',
        icon: '2️⃣'
      })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Category');
    expect(result[1].name).toEqual('Second Category');
    
    // Verify the creation timestamps maintain order
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should handle large number of categories', async () => {
    // Create multiple categories to test performance
    const manyCategories = Array.from({ length: 50 }, (_, i) => ({
      name: `Category ${i + 1}`,
      color: `#${(i * 123456).toString(16).padStart(6, '0').slice(0, 6).toUpperCase()}`,
      icon: `📁`
    }));

    await db.insert(categoriesTable)
      .values(manyCategories)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(50);
    expect(result.every(cat => cat.name.startsWith('Category'))).toBe(true);
    expect(result.every(cat => cat.color.startsWith('#'))).toBe(true);
    expect(result.every(cat => cat.icon === '📁')).toBe(true);
    expect(result.every(cat => typeof cat.id === 'number')).toBe(true);
    expect(result.every(cat => cat.created_at instanceof Date)).toBe(true);
  });
});