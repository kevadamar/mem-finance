import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { setActiveUser } from '../../../src/lib/data/idb';
import { executeCSVImport } from '../../../src/lib/data/import-csv';
import { executeSQLiteImport } from '../../../src/lib/data/import-sqlite';

type Category = { id: string; name: string; type: 'income' | 'expense'; color: string; icon: string; isDefault: boolean };

let categories: Category[];
let transactionCreates: unknown[];
let budgetCreates: unknown[];

const categoryRepo = {
	getAll: mock(async () => categories),
	getById: mock(async (id: string) => categories.find((category) => category.id === id) ?? null),
	create: mock(async (input: Omit<Category, 'id' | 'isDefault'>) => {
		const category = { ...input, id: `created-category-${categories.length + 1}`, isDefault: false };
		categories.push(category);
		return category;
	})
};

const transactionRepo = {
	getById: mock(async () => null),
	create: mock(async (input: Record<string, unknown>) => {
		transactionCreates.push(input);
		return { id: `created-transaction-${transactionCreates.length}`, ...input };
	})
};

const budgetRepo = {
	getById: mock(async () => null),
	create: mock(async (input: Record<string, unknown>) => {
		budgetCreates.push(input);
		return { id: `created-budget-${budgetCreates.length}`, ...input };
	})
};

beforeEach(() => {
	setActiveUser(crypto.randomUUID());
	categories = [];
	transactionCreates = [];
	budgetCreates = [];
	categoryRepo.getAll.mockClear();
	categoryRepo.getById.mockClear();
	categoryRepo.create.mockClear();
	transactionRepo.getById.mockClear();
	transactionRepo.create.mockClear();
	budgetRepo.getById.mockClear();
	budgetRepo.create.mockClear();
});

afterEach(() => setActiveUser(null));

describe('import repository routing', () => {
	it('imports CSV categories and transactions through repositories', async () => {
		const report = await executeCSVImport([
			{ type: 'expense', amount: 50000, categoryName: 'Makanan', date: '2026-11-02', note: 'Makan siang' }
		], { categoryRepo, transactionRepo } as unknown as NonNullable<Parameters<typeof executeCSVImport>[1]>);

		expect(report).toEqual({ successCount: 1, skipCount: 0, errorCount: 0, details: [] });
		expect(categoryRepo.create).toHaveBeenCalledTimes(1);
		expect(transactionRepo.create).toHaveBeenCalledWith({
			type: 'expense', amount: 50000, categoryId: 'created-category-1', date: '2026-11-02', note: 'Makan siang'
		});
	});

	it('keeps a partial SQLite import report and maps imported category IDs', async () => {
		budgetRepo.create.mockImplementationOnce(async () => { throw new Error('Budget rejected'); });
		const report = await executeSQLiteImport({
			categories: [{ id: 'source-category', name: 'Makanan', type: 'expense', color: '#000000', icon: 'utensils', isDefault: false }],
			transactions: [{ id: 'source-transaction', type: 'expense', amount: 50000, categoryId: 'source-category', date: '2026-11-02', note: 'Makan siang', createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }],
			budgets: [{ id: 'source-budget', categoryId: 'source-category', amount: 250000, month: 11, year: 2026, createdAt: '2026-11-02T00:00:00.000Z' }],
			summary: { totalRecords: 3, entityCounts: { categories: 1, transactions: 1, budgets: 1 } }
		}, { categoryRepo, transactionRepo, budgetRepo } as unknown as NonNullable<Parameters<typeof executeSQLiteImport>[1]>);

		expect(transactionRepo.create).toHaveBeenCalledWith({
			type: 'expense', amount: 50000, categoryId: 'created-category-1', date: '2026-11-02', note: 'Makan siang', createdAt: '2026-11-02T00:00:00.000Z'
		}, expect.any(String));
		expect(report.successCount).toBe(2);
		expect(report.errorCount).toBe(1);
		expect(report.details).toContainEqual({ entity: 'budgets', id: 'source-budget', reason: 'Budget rejected' });
	});
});
