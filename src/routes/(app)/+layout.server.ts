import { redirect } from '@sveltejs/kit';
import { FORCE_AUTH_DISABLED } from '$env/static/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (FORCE_AUTH_DISABLED === 'true') {
		return { userId: null };
	}
	if (!locals.userId) {
		throw redirect(303, '/login');
	}
	return { userId: locals.userId };
};
