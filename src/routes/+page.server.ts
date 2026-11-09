import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.userId) {
		throw redirect(303, '/dashboard');
	}
};

export const actions: Actions = {
	default: async () => {
		throw redirect(303, '/login');
	}
};
