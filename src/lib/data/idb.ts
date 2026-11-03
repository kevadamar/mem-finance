const DB_NAME = 'memfinance_db';
const DB_VERSION = 1;

export const STORES = {
	TRANSACTIONS: 'transactions',
	CATEGORIES: 'categories',
	BUDGETS: 'budgets',
	SYNC_QUEUE: 'sync_queue'
} as const;

let activeUserId: string | null = null;
const dbPromises = new Map<string, Promise<IDBDatabase>>();

/** The legacy unscoped database is deliberately left untouched for explicit recovery. */
export function setActiveUser(userId: string | null): void {
	if (userId !== null && !/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) {
		throw new Error('Invalid account identifier');
	}
	activeUserId = userId;
}

export function getActiveUser(): string {
	if (!activeUserId) throw new Error('Account identity is not ready');
	return activeUserId;
}

function openDB(): Promise<IDBDatabase> {
	const userId = getActiveUser();
	const existing = dbPromises.get(userId);
	if (existing) return existing;
	const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(`${DB_NAME}_${userId}`, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
				const store = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
				store.createIndex('date', 'date');
				store.createIndex('categoryId', 'categoryId');
				store.createIndex('type', 'type');
			}
			if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
				const store = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
				store.createIndex('type', 'type');
			}
			if (!db.objectStoreNames.contains(STORES.BUDGETS)) {
				const store = db.createObjectStore(STORES.BUDGETS, { keyPath: 'id' });
				store.createIndex('categoryId', 'categoryId');
				store.createIndex('monthYear', ['month', 'year']);
			}
			if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
				const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
				store.createIndex('timestamp', 'timestamp');
				store.createIndex('entity', 'entity');
			}
		};
	});
	dbPromises.set(userId, dbPromise);
	dbPromise.catch(() => dbPromises.delete(userId));
	return dbPromise;
}

async function tx<T>(
	storeName: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
	const userId = getActiveUser();
	const db = await openDB();
	if (getActiveUser() !== userId) throw new Error('Account changed during local operation');
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, mode);
		const store = transaction.objectStore(storeName);
		Promise.resolve(work(store))
			.then((result) => {
				transaction.oncomplete = () => userId === activeUserId ? resolve(result) : reject(new Error('Account changed during local operation'));
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			})
			.catch(reject);
	});
}

function reqAsPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function getAll<T>(storeName: string): Promise<T[]> {
	return tx<T[]>(storeName, 'readonly', (store) =>
		reqAsPromise(store.getAll() as IDBRequest<T[]>)
	);
}

export async function getOne<T>(storeName: string, key: string): Promise<T | undefined> {
	return tx<T | undefined>(storeName, 'readonly', (store) =>
		reqAsPromise(store.get(key) as IDBRequest<T | undefined>)
	);
}

export async function put<T>(storeName: string, value: T): Promise<void> {
	await tx<void>(storeName, 'readwrite', (store) => {
		store.put(value as unknown as object);
	});
}

export async function putWithQueue<T>(storeName: string, value: T, item: SyncQueueItem): Promise<void> {
	const userId = getActiveUser();
	if (item.ownerUserId !== userId) throw new Error('Queue owner does not match active account');
	const db = await openDB();
	if (getActiveUser() !== userId) throw new Error('Account changed during local operation');
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction([storeName, STORES.SYNC_QUEUE], 'readwrite');
		transaction.objectStore(storeName).put(value as unknown as object);
		transaction.objectStore(STORES.SYNC_QUEUE).add(item);
		transaction.oncomplete = () => userId === activeUserId ? resolve() : reject(new Error('Account changed during local operation'));
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

export async function bulkPut<T>(storeName: string, values: T[]): Promise<void> {
	await tx<void>(storeName, 'readwrite', (store) => {
		for (const v of values) store.put(v as unknown as object);
	});
}

export async function mergeRemote<T extends { id: string }>(storeName: string, fresh: T[], ownerUserId: string): Promise<T[]> {
	if (getActiveUser() !== ownerUserId) throw new Error('Account changed during remote merge');
	const db = await openDB();
	if (getActiveUser() !== ownerUserId) throw new Error('Account changed during remote merge');
	return new Promise<T[]>((resolve, reject) => {
		const transaction = db.transaction([storeName, STORES.SYNC_QUEUE], 'readwrite');
		const store = transaction.objectStore(storeName);
		const localRequest = store.getAll() as IDBRequest<T[]>;
		const queueRequest = transaction.objectStore(STORES.SYNC_QUEUE).getAll() as IDBRequest<SyncQueueItem[]>;
		let merged: T[] = [];
		Promise.all([reqAsPromise(localRequest), reqAsPromise(queueRequest)]).then(([local, queue]) => {
			if (activeUserId !== ownerUserId) { transaction.abort(); return; }
			const pendingIds = new Set(queue.filter((item) => item.ownerUserId === ownerUserId).map((item) => item.recordId));
			merged = [...fresh.filter((item) => !pendingIds.has(item.id)), ...local.filter((item) => pendingIds.has(item.id))];
			store.clear();
			for (const item of merged) store.put(item);
		}).catch((error) => { transaction.abort(); reject(error); });
		transaction.oncomplete = () => activeUserId === ownerUserId ? resolve(merged) : reject(new Error('Account changed during remote merge'));
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error ?? new Error('Remote merge aborted'));
	});
}

export async function importRecoveredData(
	ownerUserId: string,
	data: { transactions: object[]; categories: object[]; budgets: object[]; queue: SyncQueueItem[] }
): Promise<void> {
	if (getActiveUser() !== ownerUserId || data.queue.some((item) => item.ownerUserId !== ownerUserId)) throw new Error('Recovery account mismatch');
	const db = await openDB();
	if (getActiveUser() !== ownerUserId) throw new Error('Recovery account changed');
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(Object.values(STORES), 'readwrite');
		const datasets = [
			[STORES.CATEGORIES, data.categories], [STORES.TRANSACTIONS, data.transactions], [STORES.BUDGETS, data.budgets]
		] as const;
		const queueStore = transaction.objectStore(STORES.SYNC_QUEUE);
		Promise.all([
			...datasets.map(([storeName]) => reqAsPromise(transaction.objectStore(storeName).getAllKeys())),
			reqAsPromise(queueStore.getAll() as IDBRequest<SyncQueueItem[]>)
		]).then((existing) => {
			if (activeUserId !== ownerUserId) { transaction.abort(); return; }
			for (let i = 0; i < datasets.length; i++) {
				const [storeName, values] = datasets[i];
				const keys = new Set(existing[i] as IDBValidKey[]);
				for (const value of values) {
					const id = (value as { id?: IDBValidKey }).id;
					if (!id || keys.has(id)) continue;
					transaction.objectStore(storeName).add(value);
				}
			}
			const operationIds = new Set((existing[3] as SyncQueueItem[]).map((item) => item.operationId));
			for (const item of data.queue) {
				if (operationIds.has(item.operationId)) continue;
				const copy = { ...item };
				delete copy.id;
				queueStore.add(copy);
			}
		}).catch((error) => { transaction.abort(); reject(error); });
		transaction.oncomplete = () => activeUserId === ownerUserId ? resolve() : reject(new Error('Recovery account changed'));
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error ?? new Error('Recovery aborted'));
	});
}

export async function remove(storeName: string, key: IDBValidKey): Promise<void> {
	await tx<void>(storeName, 'readwrite', (store) => {
		store.delete(key);
	});
}

export async function clear(storeName: string): Promise<void> {
	await tx<void>(storeName, 'readwrite', (store) => {
		store.clear();
	});
}

export async function getAllFromIndex<T>(storeName: string, indexName: string, query?: IDBValidKey): Promise<T[]> {
	return tx<T[]>(storeName, 'readonly', (store) => {
		const index = store.index(indexName);
		return reqAsPromise(index.getAll(query) as IDBRequest<T[]>);
	});
}

export interface SyncQueueItem {
	id?: number;
	ownerUserId: string;
	operationId: string;
	recordId: string;
	entity: 'transactions' | 'categories' | 'budgets';
	action: 'create' | 'update' | 'delete';
	payload: unknown;
	attempts: number;
	createdAt: number;
	lastAttemptAt?: number;
	errorMessage?: string;
	status: 'pending' | 'needs_attention';
}
