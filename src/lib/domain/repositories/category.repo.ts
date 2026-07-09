import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../entities/category';

export interface ICategoryRepository {
	getAll(): Promise<Category[]>;
	getById(id: string): Promise<Category | null>;
	create(input: CreateCategoryInput): Promise<Category>;
	update(id: string, input: UpdateCategoryInput): Promise<Category>;
	delete(id: string): Promise<void>;
	restore(id: string): Promise<Category>;
}
