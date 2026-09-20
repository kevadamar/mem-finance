import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

/** Keep authenticated users or local bypass users out of the sign-in screen.
 *
 * `userId` is populated by the server hook after the Supabase session has
 * been validated, or skipped if FORCE_AUTH_DISABLED=true.
 */
export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.userId) {
		throw redirect(303, '/dashboard');
	}
	if (privateEnv.FORCE_AUTH_DISABLED === 'true' && !url.searchParams.has('force')) {
		throw redirect(303, '/dashboard');
	}
};
