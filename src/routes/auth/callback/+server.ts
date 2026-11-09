import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyStorageIntent } from '$lib/server/storage-consent';
import { createPersonalSpreadsheet } from '$lib/server/personal-storage';
import { googleIdentityEmail, createAdminFallback, isPersonalStorageEnabled } from '$lib/server/storage-ownership';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const storageIntent = cookies.get('memfinance_storage_intent');
	const personalCallback = url.searchParams.get('storage') === 'personal' && isPersonalStorageEnabled(locals.userId, locals.user?.email);
	if (storageIntent) cookies.delete('memfinance_storage_intent', { path: '/auth/callback' });
	const priorUserId = locals.userId;
	let priorSession = null;
	if (priorUserId && locals.supabase) {
		try {
			const { data } = await locals.supabase.auth.getSession();
			priorSession = data?.session ?? null;
		} catch {
			priorSession = null;
		}
	}
	const code = url.searchParams.get('code');
	if (code && locals.supabase) {
		const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			if (personalCallback) {
				if (!priorUserId || !data.user || data.user.id !== priorUserId || !verifyStorageIntent(storageIntent, priorUserId)) {
					if (priorSession) {
						const { error: restoreError } = await locals.supabase.auth.setSession({
							access_token: priorSession.access_token, refresh_token: priorSession.refresh_token
						});
						if (!restoreError) throw redirect(303, '/dashboard?storage=account_mismatch');
					}
					await locals.supabase.auth.signOut();
					throw redirect(303, '/login?error=storage_identity_mismatch');
				}
				const googleEmail = googleIdentityEmail(data.user);
				if (!googleEmail || !data.session?.provider_token) {
					try { await createAdminFallback(priorUserId); } catch { throw redirect(303, '/dashboard?storage=setup_error'); }
					throw redirect(303, '/dashboard?storage=permission_denied');
				}
				try {
					await createPersonalSpreadsheet(priorUserId, googleEmail, data.session.provider_token);
				} catch {
					throw redirect(303, '/dashboard?storage=setup_error');
				}
			}
			throw redirect(303, '/dashboard');
		}
	}
	if (personalCallback && priorUserId && verifyStorageIntent(storageIntent, priorUserId)) {
		try { await createAdminFallback(priorUserId); } catch { throw redirect(303, '/dashboard?storage=setup_error'); }
		throw redirect(303, '/dashboard?storage=permission_denied');
	}
	throw redirect(303, '/login?error=auth_failed');
};
