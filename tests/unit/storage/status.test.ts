import { expect, test } from 'bun:test';
import { classifyStorageStatus } from '../../../src/lib/server/storage-status';

const base = { ownerEmail: 'admin@example.com', adminEmail: 'admin@example.com', targetEmail: 'user@example.com', adminRole: 'owner', pendingOwner: false, initialized: true };

test('denial keeps admin ownership and pending invitation does not claim success', () => {
	expect(classifyStorageStatus(base)).toBe('ADMIN_OWNED');
	expect(classifyStorageStatus({ ...base, pendingOwner: true })).toBe('TRANSFER_PENDING');
});

test('personal ownership requires initialized data and admin editor access', () => {
	expect(classifyStorageStatus({ ...base, ownerEmail: 'user@example.com', adminRole: 'writer' })).toBe('USER_OWNED_ADMIN_EDITOR');
	expect(classifyStorageStatus({ ...base, ownerEmail: 'user@example.com', adminRole: 'reader' })).toBe('ACCESS_RECOVERY');
	expect(classifyStorageStatus({ ...base, ownerEmail: 'user@example.com', adminRole: 'writer', initialized: false })).toBe('ACCESS_RECOVERY');
	expect(classifyStorageStatus({ ...base, ownerEmail: 'other@example.com' })).toBe('ACCESS_RECOVERY');
});
