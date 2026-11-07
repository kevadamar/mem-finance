export type VerifiedStorageStatus = 'ADMIN_OWNED' | 'TRANSFER_PENDING' | 'USER_OWNED_ADMIN_EDITOR' | 'ACCESS_RECOVERY';

export function classifyStorageStatus(input: {
	ownerEmail: string;
	adminEmail: string;
	targetEmail: string;
	adminRole: string;
	pendingOwner: boolean;
	initialized: boolean;
}): VerifiedStorageStatus {
	const owner = input.ownerEmail.toLowerCase();
	const admin = input.adminEmail.toLowerCase();
	const target = input.targetEmail.toLowerCase();
	if (!owner || !admin || !target) return 'ACCESS_RECOVERY';
	if (owner === target) {
		return input.initialized && ['writer', 'owner'].includes(input.adminRole) ? 'USER_OWNED_ADMIN_EDITOR' : 'ACCESS_RECOVERY';
	}
	if (owner === admin) return input.pendingOwner ? 'TRANSFER_PENDING' : 'ADMIN_OWNED';
	return 'ACCESS_RECOVERY';
}

/**
 * Determines whether personal Google Drive storage ownership features are enabled.
 * - 'true', '1', or 'all': enabled globally for all users
 * - comma-separated list of emails or user IDs: enabled only for specific test users
 * - 'false', '0', undefined, or unset: disabled globally (safe classic mode)
 */
export function checkPersonalStorageEnabled(
	rawSetting: string | undefined | null,
	userId?: string | null,
	email?: string | null
): boolean {
	const raw = (rawSetting ?? '').trim().toLowerCase();
	if (!raw || raw === 'false' || raw === '0') return false;
	if (raw === 'true' || raw === '1' || raw === 'all') return true;

	const allowed = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
	if (userId && allowed.includes(userId.toLowerCase())) return true;
	if (email && allowed.includes(email.toLowerCase())) return true;
	return false;
}
