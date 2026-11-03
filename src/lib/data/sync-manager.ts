import { getActiveUser, getAll, put, remove, STORES, type SyncQueueItem } from './idb';

type Listener = () => void;
const listeners = new Set<Listener>();
let pendingCount = 0;
let attentionCount = 0;
let isOnline = true;
let isSyncing = false;
let generation = 0;
let activeRequest: AbortController | null = null;
let deferredSyncDepth = 0;
const isBrowser = () => typeof window !== 'undefined';

function notify() { for (const fn of listeners) fn(); }
function sameOwner(owner: string): boolean {
	try { return getActiveUser() === owner; } catch { return false; }
}
export function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }
export function getPendingSyncCount() { return pendingCount; }
export function getNeedsAttentionCount() { return attentionCount; }
export function getIsOnline() { return isOnline; }
export function getIsSyncing() { return isSyncing; }

async function updateCounts(): Promise<void> {
	if (!isBrowser()) return;
	const owner = getActiveUser();
	const items = (await getAll<SyncQueueItem>(STORES.SYNC_QUEUE)).filter((item) => item.ownerUserId === owner);
	pendingCount = items.filter((item) => item.status === 'pending').length;
	attentionCount = items.filter((item) => item.status === 'needs_attention').length;
	notify();
}

function onOnline() { isOnline = true; notify(); void syncPending(); }
function onOffline() { isOnline = false; notify(); }

export async function initSyncManager(): Promise<void> {
	if (!isBrowser()) return;
	generation++;
	isOnline = navigator.onLine;
	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);
	await updateCounts();
	if (isOnline) void syncPending();
}

export function stopSyncManager(): void {
	generation++;
	activeRequest?.abort();
	window.removeEventListener('online', onOnline);
	window.removeEventListener('offline', onOffline);
	pendingCount = 0;
	attentionCount = 0;
	notify();
}

export async function notifyQueueChanged(): Promise<void> {
	if (deferredSyncDepth > 0) return;
	await updateCounts();
	if (isOnline) void syncPending();
}

export function isSyncDeferred(): boolean { return deferredSyncDepth > 0; }

export async function withDeferredSync<T>(work: () => Promise<T>): Promise<T> {
	deferredSyncDepth++;
	try { return await work(); }
	finally {
		deferredSyncDepth--;
		if (deferredSyncDepth === 0) {
			if (isBrowser()) window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
			await notifyQueueChanged();
		}
	}
}

export async function retryNeedsAttention(): Promise<void> {
	const owner = getActiveUser();
	for (const item of await getAll<SyncQueueItem>(STORES.SYNC_QUEUE)) {
		if (item.ownerUserId !== owner || item.status !== 'needs_attention') continue;
		await put(STORES.SYNC_QUEUE, { ...item, attempts: 0, status: 'pending' as const, errorMessage: undefined });
	}
	await notifyQueueChanged();
}

function endpointFor(item: SyncQueueItem): { method: string; url: string; body?: unknown } {
	const root = `/api/${item.entity}`;
	if (item.action === 'create') return { method: 'POST', url: root, body: item.payload };
	if (item.action === 'update') return { method: 'PUT', url: `${root}/${encodeURIComponent(item.recordId)}`, body: item.payload };
	return { method: 'DELETE', url: `${root}/${encodeURIComponent(item.recordId)}` };
}

async function sendItem(item: SyncQueueItem, owner: string): Promise<{ ok: boolean; data?: unknown; error?: string; stop?: boolean }> {
	const endpoint = endpointFor(item);
	const controller = new AbortController();
	activeRequest = controller;
	try {
		const response = await fetch(endpoint.url, {
			method: endpoint.method,
			headers: { 'x-memfinance-user-id': owner, ...(endpoint.body ? { 'Content-Type': 'application/json' } : {}) },
			body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
			signal: controller.signal
		});
		const result = await response.json();
		if (response.status === 401 || response.status === 409) return { ok: false, error: 'Akun berubah atau sesi berakhir', stop: true };
		return { ok: response.ok && result.success === true, data: result.data, error: response.ok ? 'Server menolak perubahan' : `Server ${response.status}` };
	} catch {
		return { ok: false, error: 'Koneksi ke server terputus' };
	} finally {
		if (activeRequest === controller) activeRequest = null;
	}
}

export async function syncPending(): Promise<{ succeeded: number; failed: number }> {
	if (!isBrowser() || !navigator.onLine || isSyncing) return { succeeded: 0, failed: 0 };
	const owner = getActiveUser();
	if (navigator.locks) {
		return navigator.locks.request(`memfinance-sync:${owner}`, { ifAvailable: true }, (lock) =>
			lock ? runSync(owner) : { succeeded: 0, failed: 0 });
	}
	return runSync(owner);
}

async function runSync(owner: string): Promise<{ succeeded: number; failed: number }> {
	if (isSyncing || !sameOwner(owner)) return { succeeded: 0, failed: 0 };
	const run = generation;
	isSyncing = true;
	notify();
	let succeeded = 0;
	let failed = 0;
	try {
		const items = (await getAll<SyncQueueItem>(STORES.SYNC_QUEUE))
			.filter((item) => item.ownerUserId === owner && item.status === 'pending')
			.sort((a, b) => a.createdAt - b.createdAt || (a.id ?? 0) - (b.id ?? 0));
		for (const item of items) {
			if (run !== generation || !sameOwner(owner)) break;
			const result = await sendItem(item, owner);
			if (run !== generation || !sameOwner(owner)) break;
			if (result.stop) {
				window.location.reload();
				break;
			}
			if (result.ok) {
				const current = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
				const hasLater = current.some((next) => next.ownerUserId === owner && next.recordId === item.recordId && next.id !== item.id && (next.id ?? 0) > (item.id ?? 0));
				if (!hasLater && result.data && typeof result.data === 'object' && 'id' in result.data) {
					const remote = result.data as { id: unknown };
					if (typeof remote.id === 'string' && remote.id !== item.recordId) await remove(item.entity, item.recordId);
					await put(item.entity, result.data);
				}
				if (item.id !== undefined) await remove(STORES.SYNC_QUEUE, item.id);
				succeeded++;
				window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
			} else {
				const attempts = item.attempts + 1;
				await put(STORES.SYNC_QUEUE, { ...item, attempts, lastAttemptAt: Date.now(), errorMessage: result.error, status: attempts >= 5 ? 'needs_attention' : 'pending' });
				failed++;
				break;
			}
		}
	} finally {
		isSyncing = false;
		if (run === generation && sameOwner(owner)) await updateCounts();
	}
	return { succeeded, failed };
}
