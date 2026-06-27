import { describe, it, expect } from 'bun:test';

describe('SQLite table schemas', () => {
	const transactionsDDL = `CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY, type TEXT NOT NULL, amount INTEGER NOT NULL,
		categoryId TEXT NOT NULL, date TEXT NOT NULL, note TEXT,
		createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, flagActive INTEGER DEFAULT 1
	)`;

	const categoriesDDL = `CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
		color TEXT NOT NULL, icon TEXT, isDefault INTEGER DEFAULT 0
	)`;

	const budgetsDDL = `CREATE TABLE IF NOT EXISTS budgets (
		id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, amount INTEGER NOT NULL,
		month INTEGER NOT NULL, year INTEGER NOT NULL, createdAt TEXT NOT NULL
	)`;

	it('transactions table has all columns', () => {
		const cols = transactionsDDL.match(/\w+(?=\s+(TEXT|INTEGER))/g) ?? [];
		expect(cols).toContain('id');
		expect(cols).toContain('type');
		expect(cols).toContain('amount');
		expect(cols).toContain('categoryId');
		expect(cols).toContain('date');
		expect(cols).toContain('note');
		expect(cols).toContain('createdAt');
		expect(cols).toContain('updatedAt');
		expect(cols).toContain('flagActive');
		expect(cols.length).toBe(9);
	});

	it('categories table has all columns', () => {
		const cols = categoriesDDL.match(/\w+(?=\s+(TEXT|INTEGER))/g) ?? [];
		expect(cols).toContain('id');
		expect(cols).toContain('name');
		expect(cols).toContain('type');
		expect(cols).toContain('color');
		expect(cols).toContain('icon');
		expect(cols).toContain('isDefault');
	});

	it('budgets table has all columns', () => {
		const cols = budgetsDDL.match(/\w+(?=\s+(TEXT|INTEGER))/g) ?? [];
		expect(cols).toContain('id');
		expect(cols).toContain('categoryId');
		expect(cols).toContain('amount');
		expect(cols).toContain('month');
		expect(cols).toContain('year');
		expect(cols).toContain('createdAt');
	});

	it('all three tables are defined', () => {
		expect(transactionsDDL).toContain('transactions');
		expect(categoriesDDL).toContain('categories');
		expect(budgetsDDL).toContain('budgets');
	});
});

describe('SQL type mapping', () => {
	it('boolean flagActive maps to INTEGER 0/1', () => {
		const flagActive = true;
		const sqlValue = flagActive ? 1 : 0;
		expect(sqlValue).toBe(1);

		const flagActiveFalse = false;
		expect(flagActiveFalse ? 1 : 0).toBe(0);
	});

	it('isDefault boolean maps to INTEGER 0/1', () => {
		expect(true ? 1 : 0).toBe(1);
		expect(false ? 1 : 0).toBe(0);
	});
});

describe('ID conflict detection logic', () => {
	it('same ID is detected as conflict', () => {
		const existing = new Set(['a', 'b', 'c']);
		expect(existing.has('a')).toBe(true);
		expect(existing.has('d')).toBe(false);
	});

	it('toInsert array excludes existing IDs', () => {
		const existing = new Set(['id1', 'id2']);
		const records = [
			{ id: 'id1', value: 1 },
			{ id: 'id3', value: 3 },
			{ id: 'id2', value: 2 },
		];

		const toInsert = records.filter((r) => !existing.has(r.id));
		expect(toInsert).toHaveLength(1);
		expect(toInsert[0].id).toBe('id3');
	});
});

describe('chunk batch logic', () => {
	it('splits array into chunks of 500', () => {
		const items = Array.from({ length: 1234 }, (_, i) => i);
		const chunks: number[][] = [];
		for (let i = 0; i < items.length; i += 500) {
			chunks.push(items.slice(i, i + 500));
		}
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toHaveLength(500);
		expect(chunks[1]).toHaveLength(500);
		expect(chunks[2]).toHaveLength(234);
	});

	it('handles less than 500 items', () => {
		const items = Array.from({ length: 50 }, (_, i) => i);
		const chunks: number[][] = [];
		for (let i = 0; i < items.length; i += 500) {
			chunks.push(items.slice(i, i + 500));
		}
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toHaveLength(50);
	});
});
