import { browser } from '$app/environment';
import { getAll, remove, put as idbPut, type SyncQueueItem } from './idb';
import { STORES } from './idb';

type Listener = () => void;
const listeners = new Set<Listener>();

let _pendingCount = 0;
let _isOnline = true;
let _isSyncing = false;

function notify() {
	for (const fn of listeners) listeners.forEach((fn) => fn());
}

export function subscribe(fn: Listener) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function getPendingSyncCount() { return _pendingCount; }
export function getIsOnline() { return _isOnline; }
export function getIsSyncing() { return _isSyncing; }

async function updatePendingCount() {
	if (!browser) return;
	try {
		const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
		_pendingCount = items.filter((i) => i.attempts < 5).length;
		notify();
	} catch { _pendingCount = 0; notify(); }
}

export async function initSyncManager() {
	if (!browser) return;
	_isOnline = navigator.onLine;

	window.addEventListener('online', () => {
		_isOnline = true;
		notify();
		syncPending();
	});

	window.addEventListener('offline', () => {
		_isOnline = false;
		notify();
	});

	await updatePendingCount();
	const stale = (await getAll<SyncQueueItem>(STORES.SYNC_QUEUE)).filter((i) => i.attempts >= 5);
	for (const s of stale) { if (s.id !== undefined) await remove(STORES.SYNC_QUEUE, s.id); }
	await updatePendingCount();
	if (_isOnline) syncPending();
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'createdAt'>): Promise<void> {
	if (!browser) return;
	const queueItem: SyncQueueItem = {
		...item,
		attempts: 0,
		createdAt: Date.now()
	};
	try {
		await idbPut(STORES.SYNC_QUEUE, queueItem);
		await updatePendingCount();
	} catch { /* ignore */ }
}

async function getEndpoint(entity: string, action: string, payload: unknown): Promise<{ method: string; url: string; body?: unknown } | null> {
	if (entity === 'transactions') {
		if (action === 'create') return { method: 'POST', url: '/api/transactions', body: payload };
		if (action === 'update') return { method: 'PUT', url: `/api/transactions/${(payload as { id: string }).id}`, body: payload };
		if (action === 'delete') return { method: 'DELETE', url: `/api/transactions/${(payload as { id: string }).id}` };
	}
	if (entity === 'categories') {
		if (action === 'create') return { method: 'POST', url: '/api/categories', body: payload };
		if (action === 'update') return { method: 'PUT', url: `/api/categories/${(payload as { id: string }).id}`, body: payload };
		if (action === 'delete') return { method: 'DELETE', url: `/api/categories/${(payload as { id: string }).id}` };
	}
	if (entity === 'budgets') {
		if (action === 'create') return { method: 'POST', url: '/api/budgets', body: payload };
		if (action === 'update') return { method: 'PUT', url: `/api/budgets/${(payload as { id: string }).id}`, body: payload };
		if (action === 'delete') return { method: 'DELETE', url: `/api/budgets/${(payload as { id: string }).id}` };
	}
	return null;
}

async function syncItem(item: SyncQueueItem): Promise<boolean> {
	const endpoint = await getEndpoint(item.entity, item.action, item.payload);
	if (!endpoint) return true;

	try {
		const res = await fetch(endpoint.url, {
			method: endpoint.method,
			headers: endpoint.body ? { 'Content-Type': 'application/json' } : undefined,
			body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
		});
		if (!res.ok) return false;
		const json = await res.json();
		return json.success === true;
	} catch {
		return false;
	}
}

export async function syncPending(): Promise<{ succeeded: number; failed: number }> {
	if (!browser || !navigator.onLine || _isSyncing) return { succeeded: 0, failed: 0 };
	_isSyncing = true;
	notify();

	let succeeded = 0;
	let failed = 0;

	try {
		const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
		items.sort((a, b) => a.createdAt - b.createdAt);

		for (const item of items) {
			if (item.attempts >= 5) continue;
			const ok = await syncItem(item);
			if (ok) {
				if (item.id !== undefined) await remove(STORES.SYNC_QUEUE, item.id);
				succeeded++;
			} else {
				item.attempts++;
				item.lastAttemptAt = Date.now();
				await idbPut(STORES.SYNC_QUEUE, item);
				failed++;
				if (item.attempts >= 2) break;
			}
		}
	} finally {
		_isSyncing = false;
		await updatePendingCount();
	}

	return { succeeded, failed };
}


