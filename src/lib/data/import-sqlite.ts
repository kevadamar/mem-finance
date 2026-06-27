import * as idb from './idb';
import { STORES } from './idb';
import { getSQLite } from './sqlite-loader';
import type { Transaction } from '$lib/domain/entities/transaction';
import type { Category } from '$lib/domain/entities/category';
import type { Budget } from '$lib/domain/entities/budget';
import type { ImportReport } from './import-csv';

const EXPECTED_TABLES = ['transactions', 'categories', 'budgets'];

export interface SQLiteParseResult {
	transactions: Transaction[];
	categories: Category[];
	budgets: Budget[];
	summary: { totalRecords: number; entityCounts: Record<string, number> };
}

function rowToObj(columns: string[], values: unknown[]): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	for (let i = 0; i < columns.length; i++) obj[columns[i]] = values[i];
	return obj;
}

export async function parseSQLiteFile(file: File): Promise<SQLiteParseResult> {
	const buffer = await file.arrayBuffer();
	const SQL = await getSQLite();
	const db = new SQL.Database(new Uint8Array(buffer));

	const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('transactions','categories','budgets')");
	const tableNames: string[] = tables[0]?.values.map((v: unknown[]) => v[0] as string) ?? [];
	for (const expected of EXPECTED_TABLES) {
		if (!tableNames.includes(expected)) {
			db.close();
			throw new Error(`Tabel '${expected}' tidak ditemukan di database.`);
		}
	}

	function extract<T>(table: string): T[] {
		const result = db.exec(`SELECT * FROM ${table}`);
		if (result.length === 0) return [];
		const cols = result[0].columns;
		return result[0].values.map((row: unknown[]) => rowToObj(cols, row)) as T[];
	}

	const transactions = extract<Transaction>('transactions');
	const categories = extract<Category>('categories');
	const budgets = extract<Budget>('budgets');
	db.close();

	return {
		transactions,
		categories,
		budgets,
		summary: {
			totalRecords: transactions.length + categories.length + budgets.length,
			entityCounts: { transactions: transactions.length, categories: categories.length, budgets: budgets.length }
		}
	};
}

export async function executeSQLiteImport(data: SQLiteParseResult): Promise<ImportReport> {
	const report: ImportReport = { successCount: 0, skipCount: 0, errorCount: 0, details: [] };

	async function merge<T extends { id: string }>(storeName: string, records: T[]) {
		const toInsert: T[] = [];
		for (const record of records) {
			const existing = await idb.getOne(storeName, record.id);
			if (existing) {
				report.skipCount++;
				report.details.push({ entity: storeName, id: record.id, reason: 'ID sudah ada' });
			} else {
				toInsert.push(record);
			}
		}
		for (let i = 0; i < toInsert.length; i += 500) {
			await idb.bulkPut(storeName, toInsert.slice(i, i + 500));
		}
		report.successCount += toInsert.length;
	}

	await merge(STORES.TRANSACTIONS, data.transactions);
	await merge(STORES.CATEGORIES, data.categories);
	await merge(STORES.BUDGETS, data.budgets);

	window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
	return report;
}
