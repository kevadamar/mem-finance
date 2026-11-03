import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';

function script(name: string): string {
	return readFileSync(fileURLToPath(new URL(`../../../gas/${name}`, import.meta.url)), 'utf8');
}

test('GAS transaction create returns the same record after a lost response and retry', () => {
	const headers = ['id', 'type', 'amount', 'categoryId', 'date', 'note', 'createdAt', 'updatedAt', 'flagActive', 'userId'];
	const rows: unknown[][] = [headers];
	const sheet = {
		getDataRange: () => ({ getValues: () => rows }),
		appendRow: (row: unknown[]) => rows.push(row)
	};
	const context = {
		LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
		Utilities: { getUuid: () => { throw new Error('Server must not allocate a second ID'); } }
	};
	const service = vm.runInNewContext(`${script('TransactionService.gs')}\nTransactionService`, context) as {
		create: (sheet: unknown, data: unknown) => { id: string }
	};
	const input = { id: crypto.randomUUID(), type: 'expense', amount: 100, categoryId: 'food', date: '2026-11-02', userId: 'user-a' };
	const first = service.create(sheet, input);
	const second = service.create(sheet, input);
	expect(first.id).toBe(input.id);
	expect(second.id).toBe(input.id);
	expect(rows).toHaveLength(2);
});

test('GAS signature includes sheetId and rejects sheet substitution', () => {
	const secret = 'test-secret';
	const context = {
		GAS_SHARED_SECRET: secret,
		Utilities: { computeHmacSha256Signature: (value: string, key: string) => [...createHmac('sha256', key).update(value).digest()].map((byte) => byte > 127 ? byte - 256 : byte) }
	};
	const validate = vm.runInNewContext(`${script('Code.gs')}\nGAS_SHARED_SECRET = 'test-secret'; validateSignature`, context) as (request: unknown) => boolean;
	const payload = { action: 'list', table: 'transactions', data: { userId: 'user-a' }, sheetId: 'sheet-a', timestamp: Math.floor(Date.now() / 1000) };
	const signature = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
	expect(validate({ postData: { contents: JSON.stringify({ ...payload, signature }) } })).toBe(true);
	expect(validate({ postData: { contents: JSON.stringify({ ...payload, sheetId: 'sheet-b', signature }) } })).toBe(false);
});
