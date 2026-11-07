import { expect, test } from 'bun:test';
import { checkPersonalStorageEnabled } from '../../../src/lib/server/storage-status';

test('disabled by default or when false/0', () => {
	expect(checkPersonalStorageEnabled(undefined, 'u1', 'u1@test.com')).toBe(false);
	expect(checkPersonalStorageEnabled('', 'u1', 'u1@test.com')).toBe(false);
	expect(checkPersonalStorageEnabled('false', 'u1', 'u1@test.com')).toBe(false);
	expect(checkPersonalStorageEnabled('0', 'u1', 'u1@test.com')).toBe(false);
	expect(checkPersonalStorageEnabled('FALSE', 'u1', 'u1@test.com')).toBe(false);
	expect(checkPersonalStorageEnabled('  false  ', 'u1', 'u1@test.com')).toBe(false);
});

test('enabled globally when true/1/all', () => {
	expect(checkPersonalStorageEnabled('true', 'u1', 'u1@test.com')).toBe(true);
	expect(checkPersonalStorageEnabled('TRUE', 'u1', 'u1@test.com')).toBe(true);
	expect(checkPersonalStorageEnabled('1', 'u1', 'u1@test.com')).toBe(true);
	expect(checkPersonalStorageEnabled('all', 'u1', 'u1@test.com')).toBe(true);
	expect(checkPersonalStorageEnabled('  true  ', 'u1', 'u1@test.com')).toBe(true);
});

test('canary mode: enabled for specific emails or user IDs only', () => {
	const setting = 'kevadamarg@gmail.com, admin-test-id, dev@local.test';

	// Target users
	expect(checkPersonalStorageEnabled(setting, 'any-id', 'kevadamarg@gmail.com')).toBe(true);
	expect(checkPersonalStorageEnabled(setting, 'any-id', 'KEVADAMARG@GMAIL.COM')).toBe(true);
	expect(checkPersonalStorageEnabled(setting, 'admin-test-id', 'random@other.com')).toBe(true);
	expect(checkPersonalStorageEnabled(setting, 'other-id', 'dev@local.test')).toBe(true);

	// Non-target users stay in classic mode
	expect(checkPersonalStorageEnabled(setting, 'other-id', 'regular_user@gmail.com')).toBe(false);
	expect(checkPersonalStorageEnabled(setting, null, null)).toBe(false);
});
