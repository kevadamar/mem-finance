import * as idb from './idb';
import { STORES, type SyncQueueItem } from './idb';
import { isSyncDeferred, notifyQueueChanged } from './sync-manager';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '$lib/domain/entities/transaction';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '$lib/domain/entities/category';
import type { Budget, CreateBudgetInput } from '$lib/domain/entities/budget';
import type { ITransactionRepository } from '$lib/domain/repositories/transaction.repo';
import type { ICategoryRepository } from '$lib/domain/repositories/category.repo';
import type { IBudgetRepository } from '$lib/domain/repositories/budget.repo';

type Entity = Transaction | Category | Budget;
type Table = typeof STORES.TRANSACTIONS | typeof STORES.CATEGORIES | typeof STORES.BUDGETS;
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const lastSync = new Map<string, Record<Table, number>>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isBrowser = () => typeof window !== 'undefined';

function recordId(id?: string): string {
	if (id === undefined) return crypto.randomUUID();
	if (!UUID.test(id)) throw new Error('Invalid imported record ID');
	return id;
}

function emitChange(): void {
	if (isBrowser()) window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
}

function assertOwner(owner: string): void {
	if (idb.getActiveUser() !== owner) throw new Error('Account changed during data load');
}

function syncTimes(owner: string): Record<Table, number> {
	let times = lastSync.get(owner);
	if (!times) {
		times = { transactions: 0, categories: 0, budgets: 0 };
		lastSync.set(owner, times);
	}
	return times;
}

async function remoteList<T extends Entity>(table: Table, owner: string): Promise<T[]> {
	assertOwner(owner);
	const response = await fetch(`/api/${table}`, { headers: { 'x-memfinance-user-id': owner } });
	if (response.status === 409) throw new Error('Account changed; reload the app');
	const json = await response.json();
	if (!response.ok || !json.success || !Array.isArray(json.data)) throw new Error('Could not load remote data');
	return json.data as T[];
}

async function list<T extends Entity>(table: Table): Promise<T[]> {
	const owner = idb.getActiveUser();
	const cached = await idb.getAll<T>(table);
	assertOwner(owner);
	if (!isBrowser() || !navigator.onLine || Date.now() - syncTimes(owner)[table] < CACHE_MAX_AGE_MS) {
		return cached.filter((item) => item.flagActive !== false);
	}
	try {
		const fresh = await remoteList<T>(table, owner);
		assertOwner(owner);
		const merged = await idb.mergeRemote(table, fresh, owner);
		assertOwner(owner);
		syncTimes(owner)[table] = Date.now();
		return merged.filter((item) => item.flagActive !== false);
	} catch (error) {
		assertOwner(owner);
		if (error instanceof Error && error.message.startsWith('Account changed')) throw error;
		return cached.filter((item) => item.flagActive !== false);
	}
}

async function byId<T extends Entity>(table: Table, id: string): Promise<T | null> {
	return (await idb.getOne<T>(table, id)) ?? null;
}

async function persist<T extends Entity>(table: Table, value: T, action: SyncQueueItem['action'], payload: unknown): Promise<T> {
	const item: SyncQueueItem = {
		ownerUserId: idb.getActiveUser(), operationId: crypto.randomUUID(), recordId: value.id,
		entity: table, action, payload, attempts: 0, createdAt: Date.now(), status: 'pending'
	};
	await idb.putWithQueue(table, value, item);
	if (!isSyncDeferred()) emitChange();
	await notifyQueueChanged();
	return value;
}

class TransactionRepository implements ITransactionRepository {
	getAll() { return list<Transaction>(STORES.TRANSACTIONS); }
	getById(id: string) { return byId<Transaction>(STORES.TRANSACTIONS, id); }
	async create(input: CreateTransactionInput, id?: string): Promise<Transaction> {
		const now = new Date().toISOString();
		const value: Transaction = { ...input, id: recordId(id), createdAt: input.createdAt ?? now, updatedAt: now, flagActive: true };
		return persist(STORES.TRANSACTIONS, value, 'create', value);
	}
	async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
		const existing = await this.getById(id);
		if (!existing) throw new Error('Transaction not found');
		const value = { ...existing, ...input, updatedAt: new Date().toISOString() };
		return persist(STORES.TRANSACTIONS, value, 'update', { ...input, id });
	}
	async delete(id: string): Promise<void> {
		const existing = await this.getById(id);
		if (existing) await persist(STORES.TRANSACTIONS, { ...existing, flagActive: false, updatedAt: new Date().toISOString() }, 'update', { id, flagActive: false });
	}
}

class CategoryRepository implements ICategoryRepository {
	getAll() { return list<Category>(STORES.CATEGORIES); }
	getById(id: string) { return byId<Category>(STORES.CATEGORIES, id); }
	create(input: CreateCategoryInput, id?: string): Promise<Category> {
		const value: Category = { ...input, id: recordId(id), isDefault: false, flagActive: true };
		return persist(STORES.CATEGORIES, value, 'create', value);
	}
	async update(id: string, input: UpdateCategoryInput): Promise<Category> {
		const existing = await this.getById(id);
		if (!existing) throw new Error('Category not found');
		return persist(STORES.CATEGORIES, { ...existing, ...input }, 'update', { ...input, id });
	}
	async delete(id: string): Promise<void> {
		const existing = await this.getById(id);
		if (existing) await persist(STORES.CATEGORIES, { ...existing, flagActive: false }, 'update', { id, flagActive: false });
	}
	async restore(id: string): Promise<Category> {
		const existing = await this.getById(id);
		if (!existing) throw new Error('Category not found');
		return persist(STORES.CATEGORIES, { ...existing, flagActive: true }, 'update', { id, flagActive: true });
	}
}

class BudgetRepository implements IBudgetRepository {
	getAll() { return list<Budget>(STORES.BUDGETS); }
	getById(id: string) { return byId<Budget>(STORES.BUDGETS, id); }
	async getByMonth(month: number, year: number): Promise<Budget[]> {
		return (await this.getAll()).filter((item) => Number(item.month) === month && Number(item.year) === year);
	}
	create(input: CreateBudgetInput, id?: string): Promise<Budget> {
		const value: Budget = { ...input, id: recordId(id), createdAt: new Date().toISOString(), flagActive: true };
		return persist(STORES.BUDGETS, value, 'create', value);
	}
	async update(id: string, input: Partial<CreateBudgetInput>): Promise<Budget> {
		const existing = await this.getById(id);
		if (!existing) throw new Error('Budget not found');
		return persist(STORES.BUDGETS, { ...existing, ...input }, 'update', { ...input, id });
	}
	async delete(id: string): Promise<void> {
		const existing = await this.getById(id);
		if (existing) await persist(STORES.BUDGETS, { ...existing, flagActive: false }, 'update', { id, flagActive: false });
	}
	async restore(id: string): Promise<Budget> {
		const existing = await this.getById(id);
		if (!existing) throw new Error('Budget not found');
		return persist(STORES.BUDGETS, { ...existing, flagActive: true }, 'update', { id, flagActive: true });
	}
}

const transactionRepo = new TransactionRepository();
const categoryRepo = new CategoryRepository();
const budgetRepo = new BudgetRepository();
export function getTransactionRepo(): ITransactionRepository { return transactionRepo; }
export function getCategoryRepo(): ICategoryRepository { return categoryRepo; }
export function getBudgetRepo(): IBudgetRepository { return budgetRepo; }
export function invalidateBudgetCache(): void { syncTimes(idb.getActiveUser()).budgets = 0; }
export function resetRepos(): void { lastSync.clear(); }
