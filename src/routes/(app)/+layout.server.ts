import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (privateEnv.FORCE_AUTH_DISABLED === 'true') {
		return { userId: null };
	}
	if (!locals.userId) {
		throw redirect(303, '/login');
	}
	return { userId: locals.userId };
};
