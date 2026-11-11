import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyStorageIntent } from '$lib/server/storage-consent';
import { createPersonalSpreadsheet } from '$lib/server/personal-storage';
import { googleIdentityEmail, createAdminFallback, isPersonalStorageEnabled } from '$lib/server/storage-ownership';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const storageIntent = cookies.get('memfinance_storage_intent');
	const personalCallback = url.searchParams.get('storage') === 'personal' && isPersonalStorageEnabled(locals.userId, locals.user?.email);
	if (storageIntent) cookies.delete('memfinance_storage_intent', { path: '/auth/callback' });

	const code = url.searchParams.get('code');
	const oauthError = url.searchParams.get('error');
	const oauthErrorCode = url.searchParams.get('error_code');
	const oauthErrorDesc = url.searchParams.get('error_description');

	const cookieNames = cookies.getAll().map((c) => c.name);
	const hasCodeVerifier = cookieNames.some((n) => n.includes('code-verifier'));

	if (oauthError || oauthErrorDesc) {
		console.error('[auth/callback] OAuth provider returned error params:', {
			error: oauthError,
			errorCode: oauthErrorCode,
			errorDescription: oauthErrorDesc
		});
	}

	if (!locals.supabase) {
		console.error('[auth/callback] Supabase client is missing in locals. Check PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
	}

	if (!code) {
		console.error('[auth/callback] Missing auth code in query parameters:', {
			searchParams: Object.fromEntries(url.searchParams.entries()),
			hasCodeVerifier,
			cookies: cookieNames
		});
	}

	const priorUserId = locals.userId;
	let priorSession = null;
	if (priorUserId && locals.supabase) {
		try {
			const { data } = await locals.supabase.auth.getSession();
			priorSession = data?.session ?? null;
		} catch (sessionErr) {
			console.warn('[auth/callback] Failed to get prior session:', sessionErr instanceof Error ? sessionErr.message : sessionErr);
			priorSession = null;
		}
	}

	let exchangeFailedReason: string | null = null;

	if (code && locals.supabase) {
		try {
			const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
			if (error) {
				exchangeFailedReason = error.message;
				console.error('[auth/callback] exchangeCodeForSession failed:', {
					status: error.status,
					name: error.name,
					message: error.message,
					code: (error as { code?: string }).code,
					hasCodeVerifier,
					cookieNames
				});
			} else if (data?.session) {
				if (personalCallback) {
					if (!priorUserId || !data.user || data.user.id !== priorUserId || !verifyStorageIntent(storageIntent, priorUserId)) {
						console.error('[auth/callback] Personal storage identity mismatch:', {
							priorUserId,
							callbackUserId: data.user?.id,
							storageIntentVerified: priorUserId ? verifyStorageIntent(storageIntent, priorUserId) : false
						});
						if (priorSession) {
							const { error: restoreError } = await locals.supabase.auth.setSession({
								access_token: priorSession.access_token,
								refresh_token: priorSession.refresh_token
							});
							if (!restoreError) throw redirect(303, '/dashboard?storage=account_mismatch');
							console.error('[auth/callback] Failed to restore prior session:', restoreError.message);
						}
						await locals.supabase.auth.signOut();
						throw redirect(303, '/login?error=storage_identity_mismatch');
					}

					const googleEmail = googleIdentityEmail(data.user);
					if (!googleEmail || !data.session?.provider_token) {
						console.error('[auth/callback] Personal storage missing google identity email or provider token:', {
							hasEmail: !!googleEmail,
							hasProviderToken: !!data.session?.provider_token
						});
						try {
							await createAdminFallback(priorUserId);
						} catch (fallbackErr) {
							console.error('[auth/callback] createAdminFallback failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
							throw redirect(303, '/dashboard?storage=setup_error');
						}
						throw redirect(303, '/dashboard?storage=permission_denied');
					}

					try {
						await createPersonalSpreadsheet(priorUserId, googleEmail, data.session.provider_token);
					} catch (sheetErr) {
						console.error('[auth/callback] createPersonalSpreadsheet failed:', sheetErr instanceof Error ? sheetErr.message : sheetErr);
						throw redirect(303, '/dashboard?storage=setup_error');
					}
				}

				throw redirect(303, '/dashboard');
			} else {
				exchangeFailedReason = 'no_session_returned';
				console.error('[auth/callback] exchangeCodeForSession succeeded but returned no session.');
			}
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}
			exchangeFailedReason = err instanceof Error ? err.message : 'exchange_exception';
			console.error('[auth/callback] Unexpected error during code exchange:', err instanceof Error ? err.message : err);
		}
	}

	if (personalCallback && priorUserId && verifyStorageIntent(storageIntent, priorUserId)) {
		console.warn('[auth/callback] Personal storage callback fallback triggered after failure');
		try {
			await createAdminFallback(priorUserId);
		} catch (fallbackErr) {
			console.error('[auth/callback] createAdminFallback failed during final fallback:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
			throw redirect(303, '/dashboard?storage=setup_error');
		}
		throw redirect(303, '/dashboard?storage=permission_denied');
	}

	const failureReason = oauthErrorDesc || oauthError || exchangeFailedReason || (!code ? 'missing_code' : (!locals.supabase ? 'missing_supabase_client' : 'auth_failed'));
	console.error('[auth/callback] SSO authentication failed. Redirecting to /login?error=auth_failed. Reason:', failureReason);

	const reasonParam = oauthError || exchangeFailedReason ? `&reason=${encodeURIComponent(oauthError || exchangeFailedReason || '')}` : '';
	throw redirect(303, `/login?error=auth_failed${reasonParam}`);
};
