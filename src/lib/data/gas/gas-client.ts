import { runtimeEnv } from '$lib/server/env';
import { createHmac } from 'node:crypto';
import { GAS_SHARED_SECRET } from '$env/static/private';

interface GasResponse<T = unknown> {
	success: boolean;
	data: T;
	error: { code: string; message: string } | null;
}

let warmedUp = false;
const inFlight = new Map<string, Promise<unknown>>();

async function warmUp(): Promise<void> {
	if (warmedUp) return;
	try {
		await fetch(runtimeEnv.gasWebappUrl, { method: 'GET', signal: AbortSignal.timeout(10000) });
	} catch { /* ignore */ }
	warmedUp = true;
}

function getCacheKey(action: string, table: string, data?: unknown, id?: string): string {
	return `${table}:${action}:${id ?? ''}:${data ? JSON.stringify(data) : ''}`;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function signPayload(action: string, table: string, data?: unknown, id?: string): { signature: string; timestamp: number } {
	const timestamp = Math.floor(Date.now() / 1000);
	const payload = JSON.stringify({ action, table, data, id, timestamp });
	const signature = createHmac('sha256', GAS_SHARED_SECRET).update(payload).digest('hex');
	return { signature, timestamp };
}

function normalizeBody(action: string, table: string, data?: { sheetId?: string } | unknown, id?: string): Record<string, unknown> {
	const body: Record<string, unknown> = { action, table, id };
	if (data && typeof data === 'object' && !Array.isArray(data)) {
		const d = data as Record<string, unknown>;
		if (d.sheetId) {
			body.sheetId = d.sheetId;
			const { sheetId: _, ...rest } = d;
			if (Object.keys(rest).length > 0) body.data = rest;
		} else {
			body.data = d;
		}
	} else if (data) {
		body.data = data;
	}
	return { ...body, ...signPayload(action, table, body.data, id) };
}

export async function gasRequest<T = unknown>(
	action: string,
	table: string,
	data?: unknown,
	id?: string
): Promise<GasResponse<T>> {
	const cacheKey = getCacheKey(action, table, data, id);

	const existing = inFlight.get(cacheKey);
	if (existing) {
		return existing as Promise<GasResponse<T>>;
	}

	const promise = (async () => {
		if (!warmedUp) await warmUp();

		const maxAttempts = 2;
		const timeouts = [15000, 20000];

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeouts[attempt]);

			try {
				const response = await fetch(runtimeEnv.gasWebappUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(normalizeBody(action, table, data, id)),
					redirect: 'follow',
					signal: controller.signal
				});

				if (!response.ok) {
					return {
						success: false,
						data: null as T,
						error: { code: 'GAS_HTTP_ERROR', message: `GAS returned ${response.status}` }
					};
				}

				return response.json();
			} catch (err) {
				const isTimeout = err instanceof DOMException && err.name === 'AbortError';
				const isLastAttempt = attempt === maxAttempts - 1;

				if (isLastAttempt) {
					return {
						success: false,
						data: null as T,
						error: isTimeout
							? { code: 'GAS_TIMEOUT', message: `GAS request timed out after ${timeouts[attempt] / 1000}s` }
							: { code: 'GAS_UNAVAILABLE', message: 'GAS service unavailable' }
					};
				}

				await sleep(Math.min(2000 * Math.pow(2, attempt), 5000));
			} finally {
				clearTimeout(timeout);
			}
		}

		return {
			success: false,
			data: null as T,
			error: { code: 'GAS_UNAVAILABLE', message: 'GAS service unavailable' }
		};
	})();

	inFlight.set(cacheKey, promise);
	try {
		return await promise;
	} finally {
		inFlight.delete(cacheKey);
	}
}

export function invalidateCache() {
	warmedUp = false;
}
