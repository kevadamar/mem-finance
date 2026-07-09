import { browser } from '$app/environment';
import * as idb from './idb';
import { STORES } from './idb';
import { addToSyncQueue, getIsOnline } from './sync-manager';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '$lib/domain/entities/transaction';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '$lib/domain/entities/category';
import type { Budget, CreateBudgetInput } from '$lib/domain/entities/budget';
import type { ITransactionRepository } from '$lib/domain/repositories/transaction.repo';
import type { ICategoryRepository } from '$lib/domain/repositories/category.repo';
import type { IBudgetRepository } from '$lib/domain/repositories/budget.repo';

const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

interface CacheMeta {
	lastSync: number;
	loading: boolean;
}

const meta = {
	transactions: { lastSync: 0, loading: false } as CacheMeta,
	categories: { lastSync: 0, loading: false } as CacheMeta,
	budgets: { lastSync: 0, loading: false } as CacheMeta
};

function isFresh(m: CacheMeta): boolean {
	return Date.now() - m.lastSync < CACHE_MAX_AGE_MS;
}

function emitChange() {
	window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
}

async function apiGet<T>(path: string): Promise<T> {
	const res = await fetch(path);
	const json = await res.json();
	if (!json.success) throw new Error(json.error?.message ?? 'API error');
	return json.data;
}

async function apiCall<T = unknown>(path: string, method: string, body?: unknown): Promise<T> {
	const res = await fetch(path, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	const json = await res.json();
	if (!json.success) throw new Error(json.error?.message ?? 'API error');
	return json.data as T;
}

async function loadFromGas<T>(table: typeof STORES.TRANSACTIONS | typeof STORES.CATEGORIES | typeof STORES.BUDGETS): Promise<T[]> {
	if (!browser) return [];
	if (!navigator.onLine) throw new Error('offline');
	const path = table === STORES.TRANSACTIONS ? '/api/transactions' :
	             table === STORES.CATEGORIES ? '/api/categories' : '/api/budgets';
	return apiGet<T[]>(path);
}

async function syncToGas<T>(table: typeof STORES.TRANSACTIONS | typeof STORES.CATEGORIES | typeof STORES.BUDGETS): Promise<T[]> {
	const fresh = await loadFromGas<T>(table);
	if (Array.isArray(fresh) && fresh.length > 0) {
		const allLocal = await idb.getAll<T>(table);
		const freshIds = new Set(
			(fresh as Array<Record<string, unknown>>)
				.filter((item) => typeof item.id === 'string')
				.map((item) => item.id as string)
		);
		const extras = (allLocal as Array<Record<string, unknown>>).filter(
			(item) => typeof item.id === 'string' && !freshIds.has(item.id as string)
		);
		const merged = extras.length > 0 ? ([...fresh, ...extras] as unknown as T[]) : fresh;
		await idb.bulkPut<T>(table, merged);
		return merged;
	}
	return fresh;
}

class IndexedDBTransactionRepository implements ITransactionRepository {
	async getAll(): Promise<Transaction[]> {
		const cached = (await idb.getAll<Transaction>(STORES.TRANSACTIONS)).filter((t) => t.flagActive !== false);
		if (isFresh(meta.transactions) || !browser) return cached;

		meta.transactions.loading = true;
		emitChange();
		try {
			const fresh = await syncToGas<Transaction>(STORES.TRANSACTIONS);
			meta.transactions.lastSync = Date.now();
			if (fresh.length > 0) return fresh.filter((t) => t.flagActive !== false);
			if (cached.length > 0) return cached;
			return [];
		} catch {
			meta.transactions.lastSync = Date.now();
			return cached;
		} finally {
			meta.transactions.loading = false;
			emitChange();
		}
	}

	async getById(id: string): Promise<Transaction | null> {
		const tx = await idb.getOne<Transaction>(STORES.TRANSACTIONS, id);
		return tx ?? null;
	}

	async create(input: CreateTransactionInput): Promise<Transaction> {
		const now = new Date().toISOString();
		const optimistic: Transaction = {
			id: `local_${crypto.randomUUID()}`,
			...input,
			note: input.note,
			createdAt: now,
			updatedAt: now
		};

		await idb.put(STORES.TRANSACTIONS, optimistic);
		emitChange();

		if (browser && navigator.onLine) {
			try {
				const created = await apiCall<Transaction>('/api/transactions', 'POST', input);
				await idb.remove(STORES.TRANSACTIONS, optimistic.id);
				await idb.put(STORES.TRANSACTIONS, created);
				meta.transactions.lastSync = Date.now();
				emitChange();
				return created;
			} catch {
				await addToSyncQueue({
					entity: 'transactions',
					action: 'create',
					payload: input
				});
			}
		} else {
			await addToSyncQueue({
				entity: 'transactions',
				action: 'create',
				payload: input
			});
		}

		return optimistic;
	}

	async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
		const existing = await idb.getOne<Transaction>(STORES.TRANSACTIONS, id);
		if (!existing) throw new Error('Transaction not found');

		const optimistic: Transaction = {
			...existing,
			...input,
			note: input.note !== undefined ? input.note : existing.note,
			updatedAt: new Date().toISOString()
		};
		await idb.put(STORES.TRANSACTIONS, optimistic);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				const updated = await apiCall<Transaction>(`/api/transactions/${id}`, 'PUT', input);
				await idb.put(STORES.TRANSACTIONS, updated);
				emitChange();
				return updated;
			} catch {
				await addToSyncQueue({
					entity: 'transactions',
					action: 'update',
					payload: { id, ...input }
				});
			}
		} else {
			await addToSyncQueue({
				entity: 'transactions',
				action: 'update',
				payload: { id, ...input }
			});
		}

		return optimistic;
	}

	async delete(id: string): Promise<void> {
		const existing = await idb.getOne<Transaction>(STORES.TRANSACTIONS, id);
		if (!existing) return;

		const softDeleted: Transaction = { ...existing, flagActive: false, updatedAt: new Date().toISOString() };
		await idb.put(STORES.TRANSACTIONS, softDeleted);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				await apiCall(`/api/transactions/${id}`, 'PUT', { flagActive: false });
			} catch {
				await addToSyncQueue({
					entity: 'transactions',
					action: 'update',
					payload: { id, flagActive: false }
				});
			}
		} else {
			await addToSyncQueue({
				entity: 'transactions',
				action: 'update',
				payload: { id, flagActive: false }
			});
		}
	}
}

class IndexedDBCategoryRepository implements ICategoryRepository {
	async getAll(): Promise<Category[]> {
		const cached = (await idb.getAll<Category>(STORES.CATEGORIES)).filter((c) => c.flagActive !== false);
		if (cached.length === 0 && browser && navigator.onLine) {
			try {
				const fresh = await syncToGas<Category>(STORES.CATEGORIES);
				meta.categories.lastSync = Date.now();
				if (fresh.length > 0) return fresh;
				return cached;
			} catch { return cached; }
		}
		if (isFresh(meta.categories) || !browser) return cached;

		try {
			const fresh = await syncToGas<Category>(STORES.CATEGORIES);
			meta.categories.lastSync = Date.now();
			if (fresh.length > 0) return fresh;
			return cached;
		} catch { return cached; }
	}

	async getById(id: string): Promise<Category | null> {
		const c = await idb.getOne<Category>(STORES.CATEGORIES, id);
		return c ?? null;
	}

	async create(input: CreateCategoryInput): Promise<Category> {
		const optimistic: Category = {
			id: `local_${crypto.randomUUID()}`,
			...input,
			isDefault: false
		};
		await idb.put(STORES.CATEGORIES, optimistic);
		emitChange();

		if (browser && navigator.onLine) {
			try {
				const created = await apiCall<Category>('/api/categories', 'POST', input);
				await idb.remove(STORES.CATEGORIES, optimistic.id);
				await idb.put(STORES.CATEGORIES, created);
				emitChange();
				return created;
			} catch {
				await addToSyncQueue({ entity: 'categories', action: 'create', payload: input });
			}
		} else {
			await addToSyncQueue({ entity: 'categories', action: 'create', payload: input });
		}

		return optimistic;
	}

	async update(id: string, input: UpdateCategoryInput): Promise<Category> {
		const existing = await idb.getOne<Category>(STORES.CATEGORIES, id);
		if (!existing) throw new Error('Category not found');

		const optimistic: Category = { ...existing, ...input };
		await idb.put(STORES.CATEGORIES, optimistic);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				const updated = await apiCall<Category>(`/api/categories/${id}`, 'PUT', input);
				await idb.put(STORES.CATEGORIES, updated);
				emitChange();
				return updated;
			} catch {
				await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, ...input } });
			}
		} else {
			await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, ...input } });
		}
		return optimistic;
	}

	async delete(id: string): Promise<void> {
		const existing = await idb.getOne<Category>(STORES.CATEGORIES, id);
		if (!existing) return;

		const softDeleted: Category = { ...existing, flagActive: false };
		await idb.put(STORES.CATEGORIES, softDeleted);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				await apiCall(`/api/categories/${id}`, 'PUT', { flagActive: false });
			} catch {
				await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, flagActive: false } });
			}
		} else {
			await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, flagActive: false } });
		}
	}

	async restore(id: string): Promise<Category> {
		const existing = await idb.getOne<Category>(STORES.CATEGORIES, id);
		if (!existing) throw new Error('Category not found');

		const restored: Category = { ...existing, flagActive: true };
		await idb.put(STORES.CATEGORIES, restored);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				const updated = await apiCall<Category>(`/api/categories/${id}`, 'PUT', { flagActive: true });
				await idb.put(STORES.CATEGORIES, updated);
				emitChange();
				return updated;
			} catch {
				await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, flagActive: true } });
			}
		} else {
			await addToSyncQueue({ entity: 'categories', action: 'update', payload: { id, flagActive: true } });
		}
		return restored;
	}
}

class IndexedDBBudgetRepository implements IBudgetRepository {
	async getAll(): Promise<Budget[]> {
		const cached = (await idb.getAll<Budget>(STORES.BUDGETS)).filter((b) => b.flagActive !== false);
		if (isFresh(meta.budgets) || !browser) return cached;

		try {
			const fresh = await syncToGas<Budget>(STORES.BUDGETS);
			meta.budgets.lastSync = Date.now();
			if (fresh.length > 0) return fresh;
			return cached;
		} catch { return cached; }
	}

	async getByMonth(month: number, year: number): Promise<Budget[]> {
		const all = await this.getAll();
		return all.filter((b) => Number(b.month) === month && Number(b.year) === year);
	}

	async getById(id: string): Promise<Budget | null> {
		const b = await idb.getOne<Budget>(STORES.BUDGETS, id);
		return b ?? null;
	}

	async create(input: CreateBudgetInput): Promise<Budget> {
		const optimistic: Budget = {
			id: `local_${crypto.randomUUID()}`,
			...input,
			createdAt: new Date().toISOString()
		};
		await idb.put(STORES.BUDGETS, optimistic);
		emitChange();

		if (browser && navigator.onLine) {
			try {
				const created = await apiCall<Budget>('/api/budgets', 'POST', input);
				await idb.remove(STORES.BUDGETS, optimistic.id);
				await idb.put(STORES.BUDGETS, created);
				emitChange();
				return created;
			} catch {
				await addToSyncQueue({ entity: 'budgets', action: 'create', payload: input });
			}
		} else {
			await addToSyncQueue({ entity: 'budgets', action: 'create', payload: input });
		}
		return optimistic;
	}

	async update(id: string, input: Partial<CreateBudgetInput>): Promise<Budget> {
		const existing = await idb.getOne<Budget>(STORES.BUDGETS, id);
		if (!existing) throw new Error('Budget not found');

		const optimistic: Budget = { ...existing, ...input };
		await idb.put(STORES.BUDGETS, optimistic);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				const updated = await apiCall<Budget>(`/api/budgets/${id}`, 'PUT', input);
				await idb.put(STORES.BUDGETS, updated);
				emitChange();
				return updated;
			} catch {
				await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, ...input } });
			}
		} else {
			await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, ...input } });
		}
		return optimistic;
	}

	async delete(id: string): Promise<void> {
		const existing = await idb.getOne<Budget>(STORES.BUDGETS, id);
		if (!existing) return;

		const softDeleted: Budget = { ...existing, flagActive: false };
		await idb.put(STORES.BUDGETS, softDeleted);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				await apiCall(`/api/budgets/${id}`, 'PUT', { flagActive: false });
			} catch {
				await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, flagActive: false } });
			}
		} else {
			await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, flagActive: false } });
		}
	}

	async restore(id: string): Promise<Budget> {
		const existing = await idb.getOne<Budget>(STORES.BUDGETS, id);
		if (!existing) throw new Error('Budget not found');

		const restored: Budget = { ...existing, flagActive: true };
		await idb.put(STORES.BUDGETS, restored);
		emitChange();

		if (browser && navigator.onLine && !id.startsWith('local_')) {
			try {
				const updated = await apiCall<Budget>(`/api/budgets/${id}`, 'PUT', { flagActive: true });
				await idb.put(STORES.BUDGETS, updated);
				emitChange();
				return updated;
			} catch {
				await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, flagActive: true } });
			}
		} else {
			await addToSyncQueue({ entity: 'budgets', action: 'update', payload: { id, flagActive: true } });
		}
		return restored;
	}
}

let _transactionRepo: ITransactionRepository | null = null;
let _categoryRepo: ICategoryRepository | null = null;
let _budgetRepo: IBudgetRepository | null = null;

export function getTransactionRepo(): ITransactionRepository {
	if (!_transactionRepo) _transactionRepo = new IndexedDBTransactionRepository();
	return _transactionRepo;
}

export function getCategoryRepo(): ICategoryRepository {
	if (!_categoryRepo) _categoryRepo = new IndexedDBCategoryRepository();
	return _categoryRepo;
}

export function getBudgetRepo(): IBudgetRepository {
	if (!_budgetRepo) _budgetRepo = new IndexedDBBudgetRepository();
	return _budgetRepo;
}

export function invalidateBudgetCache() {
	meta.budgets.lastSync = 0;
}

export function resetRepos() {
	_transactionRepo = null;
	_categoryRepo = null;
	_budgetRepo = null;
}
