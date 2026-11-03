import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'bun:test';
import { getAll, put, setActiveUser, STORES, type SyncQueueItem } from '../../../src/lib/data/idb';
import { legacyCounts, readLegacySnapshot, recoverLegacySnapshot } from '../../../src/lib/data/legacy-recovery';

const stored = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
	getItem: (key: string) => stored.get(key) ?? null,
	setItem: (key: string, value: string) => stored.set(key, value)
} });

afterEach(() => { setActiveUser(null); stored.clear(); });

async function legacyDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('memfinance_db', 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			for (const name of [STORES.TRANSACTIONS, STORES.CATEGORIES, STORES.BUDGETS]) db.createObjectStore(name, { keyPath: 'id' });
			db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

test('legacy recovery requires explicit ownership and keeps the old database', async () => {
	const owner = crypto.randomUUID();
	const categoryId = `local_${crypto.randomUUID()}`;
	const transactionId = `local_${crypto.randomUUID()}`;
	const legacy = await legacyDatabase();
	await new Promise<void>((resolve, reject) => {
		const tx = legacy.transaction(Object.values(STORES), 'readwrite');
		tx.objectStore(STORES.CATEGORIES).add({ id: categoryId, name: 'Makanan', type: 'expense', color: '#000', icon: 'food', isDefault: false });
		tx.objectStore(STORES.TRANSACTIONS).add({ id: transactionId, type: 'expense', amount: 100, categoryId, date: '2026-11-02', createdAt: '2026-11-02T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' });
		tx.objectStore(STORES.SYNC_QUEUE).add({ entity: 'transactions', action: 'create', payload: { amount: 100 }, attempts: 0, createdAt: Date.now() });
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	legacy.close();
	const snapshot = await readLegacySnapshot();
	expect(snapshot && legacyCounts(snapshot)).toEqual({ transactions: 1, categories: 1, budgets: 0, pending: 1 });
	if (!snapshot) throw new Error('Missing test snapshot');
	setActiveUser(owner);
	await put(STORES.CATEGORIES, { id: categoryId.slice(6), name: 'Server version' });
	await recoverLegacySnapshot(snapshot, owner);
	const recovered = await getAll<{ id: string; categoryId: string }>(STORES.TRANSACTIONS);
	expect(recovered[0].id).toBe(transactionId.slice(6));
	expect(recovered[0].categoryId).toBe(categoryId.slice(6));
	expect((await getAll<{ name: string }>(STORES.CATEGORIES))[0].name).toBe('Server version');
	const recoveredQueue = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
	expect(recoveredQueue).toHaveLength(2);
	expect(recoveredQueue.every((item) => item.status === 'needs_attention')).toBe(true);
	expect((await readLegacySnapshot())?.transactions).toHaveLength(1);
	expect(stored.get('memfinance_legacy_recovered_by')).toBe(owner);
	stored.delete('memfinance_legacy_recovered_by');
	await recoverLegacySnapshot(snapshot, owner);
	expect(await getAll<SyncQueueItem>(STORES.SYNC_QUEUE)).toHaveLength(2);
});

test('legacy rows tagged for another account cannot be claimed', async () => {
	const owner = crypto.randomUUID();
	setActiveUser(owner);
	await expect(recoverLegacySnapshot({
		transactions: [{ id: crypto.randomUUID(), userId: crypto.randomUUID(), categoryId: 'c' }],
		categories: [], budgets: [], sync_queue: []
	}, owner)).rejects.toThrow('another account');
	expect(await getAll(STORES.TRANSACTIONS)).toEqual([]);
});
