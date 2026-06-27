import * as idb from './idb';
import { STORES } from './idb';
import { getSQLite } from './sqlite-loader';
import type { Transaction } from '$lib/domain/entities/transaction';
import type { Category } from '$lib/domain/entities/category';
import type { Budget } from '$lib/domain/entities/budget';

export async function exportSQLite(): Promise<{ count: number }> {
	const [transactions, categories, budgets] = await Promise.all([
		idb.getAll<Transaction>(STORES.TRANSACTIONS),
		idb.getAll<Category>(STORES.CATEGORIES),
		idb.getAll<Budget>(STORES.BUDGETS)
	]);

	const SQL = await getSQLite();
	const db = new SQL.Database();

	db.run(`CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY, type TEXT NOT NULL, amount INTEGER NOT NULL,
		categoryId TEXT NOT NULL, date TEXT NOT NULL, note TEXT,
		createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, flagActive INTEGER DEFAULT 1
	)`);
	db.run(`CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
		color TEXT NOT NULL, icon TEXT, isDefault INTEGER DEFAULT 0
	)`);
	db.run(`CREATE TABLE IF NOT EXISTS budgets (
		id TEXT PRIMARY KEY, categoryId TEXT NOT NULL, amount INTEGER NOT NULL,
		month INTEGER NOT NULL, year INTEGER NOT NULL, createdAt TEXT NOT NULL
	)`);

	{
		const stmt = db.prepare('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?)');
		for (const t of transactions) {
			stmt.run([t.id, t.type, t.amount, t.categoryId, t.date, t.note ?? null, t.createdAt, t.updatedAt, t.flagActive ?? 1] as never[]);
		}
		stmt.free();
	}
	{
		const stmt = db.prepare('INSERT INTO categories VALUES (?,?,?,?,?,?)');
		for (const c of categories) {
			stmt.run([c.id, c.name, c.type, c.color, c.icon, c.isDefault ? 1 : 0] as never[]);
		}
		stmt.free();
	}
	{
		const stmt = db.prepare('INSERT INTO budgets VALUES (?,?,?,?,?,?)');
		for (const b of budgets) {
			stmt.run([b.id, b.categoryId, b.amount, b.month, b.year, b.createdAt]);
		}
		stmt.free();
	}

	const buffer = db.export();
	const blob = new Blob([buffer as BlobPart], { type: 'application/x-sqlite3' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `memfinance-db-${new Date().toISOString().split('T')[0]}.sqlite`;
	a.click();
	URL.revokeObjectURL(url);
	db.close();

	const total = transactions.length + categories.length + budgets.length;
	return { count: total };
}
