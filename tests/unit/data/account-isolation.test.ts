import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'bun:test';
import { getAll, putWithQueue, setActiveUser, STORES, type SyncQueueItem } from '../../../src/lib/data/idb';

afterEach(() => setActiveUser(null));

test('local records and pending writes stay in the verified account database', async () => {
	const accountA = crypto.randomUUID();
	const accountB = crypto.randomUUID();
	setActiveUser(accountA);
	const item: SyncQueueItem = {
		ownerUserId: accountA, operationId: crypto.randomUUID(), recordId: 'tx-a', entity: 'transactions',
		action: 'create', payload: { id: 'tx-a' }, attempts: 0, createdAt: Date.now(), status: 'pending'
	};
	await putWithQueue(STORES.TRANSACTIONS, { id: 'tx-a', amount: 100 }, item);

	setActiveUser(accountB);
	expect(await getAll(STORES.TRANSACTIONS)).toEqual([]);
	expect(await getAll(STORES.SYNC_QUEUE)).toEqual([]);
	await expect(putWithQueue(STORES.TRANSACTIONS, { id: 'wrong-owner' }, item)).rejects.toThrow();

	setActiveUser(accountA);
	expect(await getAll(STORES.TRANSACTIONS)).toEqual([{ id: 'tx-a', amount: 100 }]);
	expect((await getAll<SyncQueueItem>(STORES.SYNC_QUEUE))[0].operationId).toBe(item.operationId);
});

test('local data is inaccessible before an account is selected', async () => {
	setActiveUser(null);
	await expect(getAll(STORES.TRANSACTIONS)).rejects.toThrow('Account identity is not ready');
});
