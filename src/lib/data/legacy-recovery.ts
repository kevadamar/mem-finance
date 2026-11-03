import { getActiveUser, getAll, importRecoveredData, STORES, type SyncQueueItem } from './idb';
import { notifyQueueChanged } from './sync-manager';

const LEGACY_NAME = 'memfinance_db';
const CLAIM_KEY = 'memfinance_legacy_recovered_by';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row = Record<string, unknown>;

export interface LegacySnapshot {
	transactions: Row[];
	categories: Row[];
	budgets: Row[];
	sync_queue: Row[];
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function openLegacy(): Promise<IDBDatabase | null> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(LEGACY_NAME);
		let missing = false;
		request.onupgradeneeded = () => { missing = true; request.transaction?.abort(); };
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => missing ? resolve(null) : reject(request.error);
	});
}

export function legacyClaimedBy(): string | null {
	return localStorage.getItem(CLAIM_KEY);
}

export async function readLegacySnapshot(): Promise<LegacySnapshot | null> {
	const db = await openLegacy();
	if (!db) return null;
	try {
		const names = Object.values(STORES).filter((name) => db.objectStoreNames.contains(name));
		if (names.length === 0) return null;
		const transaction = db.transaction(names, 'readonly');
		const values = await Promise.all(names.map((name) => requestResult(transaction.objectStore(name).getAll() as IDBRequest<Row[]>)));
		const result: LegacySnapshot = { transactions: [], categories: [], budgets: [], sync_queue: [] };
		for (let i = 0; i < names.length; i++) result[names[i] as keyof LegacySnapshot] = values[i];
		return result;
	} finally { db.close(); }
}

export function legacyCounts(snapshot: LegacySnapshot) {
	return {
		transactions: snapshot.transactions.length, categories: snapshot.categories.length,
		budgets: snapshot.budgets.length, pending: snapshot.sync_queue.length
	};
}

export function downloadLegacyBackup(snapshot: LegacySnapshot): void {
	const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: snapshot })], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'memfinance-legacy-local-backup.json';
	link.click();
	URL.revokeObjectURL(url);
}

async function stableId(entity: string, rawId: unknown): Promise<string> {
	if (typeof rawId !== 'string' || !rawId) throw new Error('Legacy record has no ID');
	const stripped = rawId.startsWith('local_') ? rawId.slice(6) : rawId;
	if (UUID.test(stripped)) return stripped;
	const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`legacy:${entity}:${rawId}`)));
	const hex = [...bytes.slice(0, 16)].map((value) => value.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assertLegacyOwner(row: Row, owner: string): void {
	if (typeof row.userId === 'string' && row.userId !== owner && row.userId !== 'default-admin') {
		throw new Error('Legacy data contains records from another account; manual review is required');
	}
}

export async function recoverLegacySnapshot(snapshot: LegacySnapshot, ownerUserId: string): Promise<void> {
	if (getActiveUser() !== ownerUserId) throw new Error('Account changed during legacy recovery');
	const claimedBy = legacyClaimedBy();
	if (claimedBy && claimedBy !== ownerUserId) throw new Error('Legacy data was already claimed by another account');
	if (claimedBy === ownerUserId) return;
	const categoryIds = new Map<string, string>();
	const categories: Row[] = [];
	const transactions: Row[] = [];
	const budgets: Row[] = [];
	const queue: SyncQueueItem[] = [];
	const localCreates: { entity: SyncQueueItem['entity']; row: Row }[] = [];
	const unlinkedCreates: Record<SyncQueueItem['entity'], number> = { transactions: 0, categories: 0, budgets: 0 };
	for (const row of snapshot.categories) {
		assertLegacyOwner(row, ownerUserId);
		const id = await stableId('categories', row.id);
		categoryIds.set(String(row.id), id);
		if (String(row.id).startsWith('local_') && row.flagActive === false) continue;
		const copy = { ...row, id };
		categories.push(copy);
		if (String(row.id).startsWith('local_')) localCreates.push({ entity: 'categories', row: copy });
	}
	for (const [entity, rows, target] of [
		['transactions', snapshot.transactions, transactions], ['budgets', snapshot.budgets, budgets]
	] as const) {
		for (const row of rows) {
			assertLegacyOwner(row, ownerUserId);
			if (typeof row.categoryId !== 'string') throw new Error('Legacy record has no category ID');
			if (String(row.id).startsWith('local_') && row.flagActive === false) continue;
			const copy = { ...row, id: await stableId(entity, row.id), categoryId: categoryIds.get(row.categoryId) ?? row.categoryId };
			target.push(copy);
			if (String(row.id).startsWith('local_')) localCreates.push({ entity, row: copy });
		}
	}
	for (const { entity, row } of localCreates) {
		queue.push({ ownerUserId, operationId: `legacy-create-${entity}-${String(row.id)}`, recordId: String(row.id), entity,
			action: 'create', payload: row, attempts: 0, createdAt: entity === 'categories' ? 0 : Number(Date.parse(String(row.createdAt ?? ''))) || Date.now(), status: 'needs_attention' });
	}
	for (const old of snapshot.sync_queue) {
		const payload = old.payload;
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Legacy queue contains an invalid operation');
		const body = payload as Row;
		assertLegacyOwner(body, ownerUserId);
		const entity = old.entity;
		const action = old.action;
		if (!['transactions', 'categories', 'budgets'].includes(String(entity)) || !['create', 'update', 'delete'].includes(String(action))) throw new Error('Legacy queue contains an unknown operation');
		if (typeof body.id === 'string' && body.id.startsWith('local_')) continue; // Collapsed into one create from final local state.
		if (action === 'create' && !body.id) {
			unlinkedCreates[entity as SyncQueueItem['entity']]++;
			continue; // Old create without ID is represented by its local_* record.
		}
		if (typeof body.id !== 'string') throw new Error('Legacy queue operation has no record ID');
		const recordId = await stableId(String(entity), body.id);
		queue.push({ ownerUserId, operationId: `legacy-${String(old.id ?? crypto.randomUUID())}`, recordId,
			entity: entity as SyncQueueItem['entity'], action: action as SyncQueueItem['action'],
			payload: { ...body, id: recordId }, attempts: Number(old.attempts ?? 0),
			createdAt: Number(old.createdAt ?? Date.now()), status: 'needs_attention' });
	}
	for (const entity of ['categories', 'transactions', 'budgets'] as const) {
		if (unlinkedCreates[entity] > localCreates.filter((item) => item.entity === entity).length) {
			throw new Error('Legacy queue has unmatched creates; manual review is required');
		}
	}
	if (getActiveUser() !== ownerUserId) throw new Error('Account changed during legacy recovery');
	queue.sort((a, b) => (a.action === 'create' && a.entity === 'categories' ? -1 : 0) - (b.action === 'create' && b.entity === 'categories' ? -1 : 0) || a.createdAt - b.createdAt);
	await importRecoveredData(ownerUserId, { transactions, categories, budgets, queue });
	const [savedTransactions, savedCategories, savedBudgets, savedQueue] = await Promise.all([
		getAll(STORES.TRANSACTIONS), getAll(STORES.CATEGORIES), getAll(STORES.BUDGETS), getAll(STORES.SYNC_QUEUE)
	]);
	if (savedTransactions.length < transactions.length || savedCategories.length < categories.length || savedBudgets.length < budgets.length || savedQueue.length < queue.length) {
		throw new Error('Legacy recovery verification failed; original database is retained');
	}
	localStorage.setItem(CLAIM_KEY, ownerUserId);
	await notifyQueueChanged();
}
