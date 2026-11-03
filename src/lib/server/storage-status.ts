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
