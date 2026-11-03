import type { Budget, CreateBudgetInput } from '../entities/budget';

export interface IBudgetRepository {
	getAll(): Promise<Budget[]>;
	getByMonth(month: number, year: number): Promise<Budget[]>;
	getById(id: string): Promise<Budget | null>;
	create(input: CreateBudgetInput, id?: string): Promise<Budget>;
	update(id: string, input: Partial<CreateBudgetInput>): Promise<Budget>;
	delete(id: string): Promise<void>;
	restore(id: string): Promise<Budget>;
}
