import { getSQLite } from './sqlite-loader';
import { getBudgetRepo, getCategoryRepo, getTransactionRepo } from './repository-factory';
import { withDeferredSync } from './sync-manager';
import { getActiveUser } from './idb';
import type { Transaction } from '$lib/domain/entities/transaction';
import type { Category } from '$lib/domain/entities/category';
import type { Budget } from '$lib/domain/entities/budget';
import type { ImportReport } from './import-csv';
import type { ICategoryRepository } from '$lib/domain/repositories/category.repo';
import type { ITransactionRepository } from '$lib/domain/repositories/transaction.repo';
import type { IBudgetRepository } from '$lib/domain/repositories/budget.repo';

const EXPECTED_TABLES = ['transactions', 'categories', 'budgets'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function stableImportId(entity: string, sourceId: string): Promise<string> {
	if (UUID.test(sourceId)) return sourceId;
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${entity}:${sourceId}`));
	const hex = [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

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

type SQLiteRepositories = {
	categoryRepo: Pick<ICategoryRepository, 'getById' | 'create'>;
	transactionRepo: Pick<ITransactionRepository, 'getById' | 'create'>;
	budgetRepo: Pick<IBudgetRepository, 'getById' | 'create'>;
};

export async function executeSQLiteImport(data: SQLiteParseResult, repositories: SQLiteRepositories = {
	categoryRepo: getCategoryRepo(), transactionRepo: getTransactionRepo(), budgetRepo: getBudgetRepo()
}): Promise<ImportReport> {
	return withDeferredSync(async () => {
	const owner = getActiveUser();
	const assertOwner = () => { if (getActiveUser() !== owner) throw new Error('Account changed during import'); };
	const report: ImportReport = { successCount: 0, skipCount: 0, errorCount: 0, details: [] };
	const { categoryRepo, transactionRepo, budgetRepo } = repositories;
	const categoryIds = new Map<string, string>();
	const importedCategoryIds = new Set(data.categories.map((category) => category.id));

	for (const category of data.categories) {
		assertOwner();
		try {
			const importId = await stableImportId('categories', category.id);
			const existing = await categoryRepo.getById(importId);
			if (existing) {
				categoryIds.set(category.id, existing.id);
				report.skipCount++;
				report.details.push({ entity: 'categories', id: category.id, reason: 'ID sudah ada' });
				continue;
			}
			const created = await categoryRepo.create({
				name: category.name,
				type: category.type,
				color: category.color,
				icon: category.icon
			}, importId);
			categoryIds.set(category.id, created.id);
			report.successCount++;
		} catch (err) {
			assertOwner();
			report.errorCount++;
			report.details.push({ entity: 'categories', id: category.id, reason: err instanceof Error ? err.message : 'Unknown error' });
		}
	}

	for (const transaction of data.transactions) {
		assertOwner();
		try {
			const importId = await stableImportId('transactions', transaction.id);
			if (await transactionRepo.getById(importId)) {
				report.skipCount++;
				report.details.push({ entity: 'transactions', id: transaction.id, reason: 'ID sudah ada' });
				continue;
			}
			if (importedCategoryIds.has(transaction.categoryId) && !categoryIds.has(transaction.categoryId)) {
				throw new Error('Kategori referensi tidak dapat diimpor');
			}
			const categoryId = categoryIds.get(transaction.categoryId) ?? transaction.categoryId;
			await transactionRepo.create({
				type: transaction.type,
				amount: transaction.amount,
				categoryId,
				date: transaction.date,
				note: transaction.note,
				createdAt: transaction.createdAt
			}, importId);
			report.successCount++;
		} catch (err) {
			assertOwner();
			report.errorCount++;
			report.details.push({ entity: 'transactions', id: transaction.id, reason: err instanceof Error ? err.message : 'Unknown error' });
		}
	}

	for (const budget of data.budgets) {
		assertOwner();
		try {
			const importId = await stableImportId('budgets', budget.id);
			if (await budgetRepo.getById(importId)) {
				report.skipCount++;
				report.details.push({ entity: 'budgets', id: budget.id, reason: 'ID sudah ada' });
				continue;
			}
			if (importedCategoryIds.has(budget.categoryId) && !categoryIds.has(budget.categoryId)) {
				throw new Error('Kategori referensi tidak dapat diimpor');
			}
			await budgetRepo.create({
				categoryId: categoryIds.get(budget.categoryId) ?? budget.categoryId,
				amount: budget.amount,
				month: budget.month,
				year: budget.year
			}, importId);
			report.successCount++;
		} catch (err) {
			assertOwner();
			report.errorCount++;
			report.details.push({ entity: 'budgets', id: budget.id, reason: err instanceof Error ? err.message : 'Unknown error' });
		}
	}

	return report;
	});
}
