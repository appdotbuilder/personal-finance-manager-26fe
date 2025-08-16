import { type CreateCategoryInput, type Category } from '../schema';

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new expense/income category and persisting it in the database.
    // This enables users to organize their transactions by custom categories like "Food", "Transportation", etc.
    return Promise.resolve({
        id: 1, // Placeholder ID
        name: input.name,
        color: input.color,
        icon: input.icon,
        created_at: new Date()
    } as Category);
}