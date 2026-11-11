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

	const errorParam = url.searchParams.get('error');
	const reasonParam = url.searchParams.get('reason');
	let authError = '';

	if (errorParam === 'auth_failed') {
		authError = reasonParam
			? `Login SSO gagal: ${reasonParam}. Silakan coba lagi atau hubungi administrator.`
			: 'Login SSO gagal atau sesi telah berakhir. Silakan coba masuk kembali.';
	} else if (errorParam === 'storage_identity_mismatch') {
		authError = 'Akun Google yang dipilih tidak sesuai dengan akun MemFinance Anda.';
	} else if (errorParam) {
		authError = `Terjadi kesalahan saat login (${errorParam}). Silakan coba lagi.`;
	}

	return {
		canBypass: privateEnv.FORCE_AUTH_DISABLED === 'true',
		authError
	};
};

