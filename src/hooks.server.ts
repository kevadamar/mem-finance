import { createSupabaseServerClient } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { FORCE_AUTH_DISABLED } from '$env/static/private';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/healthz'];

export const handle: Handle = async ({ event, resolve }) => {
	if (FORCE_AUTH_DISABLED === 'true') {
		return resolve(event);
	}

	const supabase = createSupabaseServerClient(event);
	event.locals.supabase = supabase;

	const { data: claimsData, error } = await supabase.auth.getClaims();

	if (claimsData?.claims?.sub) {
		event.locals.userId = claimsData.claims.sub as string;
	} else {
		const isProtected = !PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p));
		if (isProtected) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};
