import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const MAX_AGE_SECONDS = 10 * 60;

function mac(value: string): string {
	if (!env.GAS_SHARED_SECRET) throw new Error('Storage consent secret unavailable');
	return createHmac('sha256', env.GAS_SHARED_SECRET).update(value).digest('hex');
}

export function createStorageIntent(userId: string): string {
	const value = `${userId}:${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}:${randomUUID()}`;
	return `${value}:${mac(value)}`;
}

export function verifyStorageIntent(intent: string | undefined, userId: string): boolean {
	if (!intent) return false;
	const parts = intent.split(':');
	if (parts.length !== 4 || parts[0] !== userId) return false;
	const expiry = Number(parts[1]);
	if (!Number.isInteger(expiry) || expiry < Date.now() / 1000) return false;
	const value = parts.slice(0, 3).join(':');
	const expected = Buffer.from(mac(value), 'hex');
	const actual = Buffer.from(parts[3], 'hex');
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
