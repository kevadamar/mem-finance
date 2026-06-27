const DB_NAME = 'memfinance_db';
const DB_VERSION = 1;

export const STORES = {
	TRANSACTIONS: 'transactions',
	CATEGORIES: 'categories',
	BUDGETS: 'budgets',
	SYNC_QUEUE: 'sync_queue'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
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
	return dbPromise;
}

async function tx<T>(
	storeName: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, mode);
		const store = transaction.objectStore(storeName);
		Promise.resolve(work(store))
			.then((result) => {
				transaction.oncomplete = () => resolve(result);
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

export async function bulkPut<T>(storeName: string, values: T[]): Promise<void> {
	await tx<void>(storeName, 'readwrite', (store) => {
		for (const v of values) store.put(v as unknown as object);
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
	entity: 'transactions' | 'categories' | 'budgets';
	action: 'create' | 'update' | 'delete';
	payload: unknown;
	attempts: number;
	createdAt: number;
	lastAttemptAt?: number;
	errorMessage?: string;
}
