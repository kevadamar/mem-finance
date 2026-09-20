import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { getDevUser } from '$lib/server/dev-user';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (privateEnv.FORCE_AUTH_DISABLED === 'true') {
		const devUser = getDevUser();
		return {
			userId: locals.userId ?? devUser.id,
			user: locals.user ?? devUser
		};
	}
	if (!locals.userId) {
		throw redirect(303, '/login');
	}
	return {
		userId: locals.userId,
		user: locals.user ?? null
	};
};
