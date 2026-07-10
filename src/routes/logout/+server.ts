import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.supabase) {
		await locals.supabase.auth.signOut();
	}
	const allCookies = cookies.getAll();
	for (const c of allCookies) {
		if (c.name.startsWith('sb-')) {
			cookies.delete(c.name, { path: '/' });
		}
	}
	throw redirect(303, '/login');
};
