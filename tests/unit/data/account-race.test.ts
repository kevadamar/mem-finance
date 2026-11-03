import 'fake-indexeddb/auto';
import { afterEach, expect, test } from 'bun:test';

const idb = await import('../../../src/lib/data/idb');
const { getTransactionRepo, resetRepos } = await import('../../../src/lib/data/repository-factory');
const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;

afterEach(() => {
	idb.setActiveUser(null);
	resetRepos();
	globalThis.fetch = originalFetch;
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
	Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

function browserGlobals() {
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => {} } });
}

function response(data: unknown): Response {
	return { ok: true, status: 200, json: async () => ({ success: true, data }) } as Response;
}

test('late response for account A cannot enter account B cache', async () => {
	browserGlobals();
	const a = crypto.randomUUID();
	const b = crypto.randomUUID();
	let release: ((value: Response) => void) | undefined;
	const started = Promise.withResolvers<void>();
	globalThis.fetch = (() => {
		started.resolve();
		return new Promise<Response>((resolve) => { release = resolve; });
	}) as unknown as typeof fetch;
	idb.setActiveUser(a);
	const loading = getTransactionRepo().getAll();
	await started.promise;
	idb.setActiveUser(b);
	release?.(response([{ id: 'private-a', type: 'expense', amount: 1, categoryId: 'x', date: '2026-11-02', createdAt: '', updatedAt: '' }]));
	await expect(loading).rejects.toThrow('Account changed');
	expect(await idb.getAll(idb.STORES.TRANSACTIONS)).toEqual([]);
});

test('account B does not reuse account A sync timestamp', async () => {
	browserGlobals();
	const a = crypto.randomUUID();
	const b = crypto.randomUUID();
	const fetchedOwners: string[] = [];
	globalThis.fetch = (async (_url, init) => {
		const owner = new Headers(init?.headers).get('x-memfinance-user-id') ?? '';
		fetchedOwners.push(owner);
		return response([]);
	}) as typeof fetch;
	idb.setActiveUser(a);
	await getTransactionRepo().getAll();
	idb.setActiveUser(b);
	await getTransactionRepo().getAll();
	expect(fetchedOwners).toEqual([a, b]);
});

test('remote refresh preserves a mutation queued while the request is in flight', async () => {
	browserGlobals();
	const owner = crypto.randomUUID();
	idb.setActiveUser(owner);
	let release: ((value: Response) => void) | undefined;
	const started = Promise.withResolvers<void>();
	globalThis.fetch = (() => {
		started.resolve();
		return new Promise<Response>((resolve) => { release = resolve; });
	}) as unknown as typeof fetch;
	const loading = getTransactionRepo().getAll();
	await started.promise;
	const transaction = { id: crypto.randomUUID(), type: 'expense', amount: 500, categoryId: 'food', date: '2026-11-02', createdAt: '', updatedAt: '' };
	await idb.putWithQueue(idb.STORES.TRANSACTIONS, transaction, {
		ownerUserId: owner, operationId: crypto.randomUUID(), recordId: transaction.id,
		entity: 'transactions', action: 'create', payload: transaction, attempts: 0, createdAt: Date.now(), status: 'pending'
	});
	release?.(response([]));
	expect((await loading).map((item) => item.id)).toEqual([transaction.id]);
	expect((await idb.getAll<{ id: string }>(idb.STORES.TRANSACTIONS))[0].id).toBe(transaction.id);
});
