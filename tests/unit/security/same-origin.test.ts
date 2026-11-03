import { expect, test } from 'bun:test';
import { isSameOrigin } from '../../../src/lib/server/same-origin';

test('state-changing routes accept the application origin only', () => {
	const url = new URL('https://finance.example.com/api/storage/transfer');
	expect(isSameOrigin(new Request(url, { method: 'POST', headers: { origin: 'https://finance.example.com' } }), url)).toBe(true);
	expect(isSameOrigin(new Request(url, { method: 'POST', headers: { origin: 'https://other.example.com' } }), url)).toBe(false);
	expect(isSameOrigin(new Request(url, { method: 'POST' }), url)).toBe(false);
});
