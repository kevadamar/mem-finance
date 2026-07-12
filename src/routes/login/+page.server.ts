import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Keep authenticated users out of the sign-in screen.
 *
 * `userId` is populated by the server hook after the Supabase session has
 * been validated, so this redirect works on direct loads as well as landing
 * page navigation without exposing session logic to the browser.
 */
export const load: PageServerLoad = ({ locals }) => {
	if (locals.userId) {
		throw redirect(303, '/dashboard');
	}
};
