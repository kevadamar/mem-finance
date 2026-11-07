import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { getDevUser } from '$lib/server/dev-user';
import { googleIdentityEmail, isPersonalStorageEnabled } from '$lib/server/storage-ownership';
import type { User } from '@supabase/supabase-js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const personalStorageEnabled = isPersonalStorageEnabled(locals.userId, locals.user?.email);
	if (privateEnv.FORCE_AUTH_DISABLED === 'true') {
		const devUser = getDevUser();
		return {
			userId: locals.userId ?? devUser.id,
			user: locals.user ?? devUser,
			storageStatus: personalStorageEnabled ? (locals.storageStatus ?? 'SETUP_ERROR') : 'ADMIN_OWNED',
			personalStorageEnabled,
			googleOwnerEmail: personalStorageEnabled ? (locals.googleOwnerEmail ?? null) : null,
			googleConnected: !!googleIdentityEmail(locals.user as User | null),
			connectedGoogleEmail: googleIdentityEmail(locals.user as User | null)
		};
	}
	if (!locals.userId) {
		throw redirect(303, '/login');
	}
	return {
		userId: locals.userId,
		user: locals.user ?? null,
		storageStatus: personalStorageEnabled ? (locals.storageStatus ?? 'SETUP_ERROR') : 'ADMIN_OWNED',
		personalStorageEnabled,
		googleOwnerEmail: personalStorageEnabled ? (locals.googleOwnerEmail ?? null) : null,
		googleConnected: !!googleIdentityEmail(locals.user as User | null),
		connectedGoogleEmail: googleIdentityEmail(locals.user as User | null)
	};
};
