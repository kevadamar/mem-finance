import { env as privateEnv } from '$env/dynamic/private';
import type { AppUser, UserMetaData } from '$lib/types/user';

export type { AppUser, UserMetaData };

/**
 * Resolves the local development user dynamically from environment variables.
 * Prioritizes DEV_USER_JSON if provided; otherwise builds from individual DEV_USER_* variables.
 */
export function getDevUser(): AppUser {
	if (privateEnv.DEV_USER_JSON) {
		try {
			const parsed = JSON.parse(privateEnv.DEV_USER_JSON);
			if (parsed && typeof parsed === 'object' && parsed.id) {
				return {
					...parsed,
					user_metadata: parsed.user_metadata || parsed.raw_user_meta_data || {},
					app_metadata: parsed.app_metadata || parsed.raw_app_meta_data || { provider: 'google', providers: ['google'] }
				};
			}
		} catch (e) {
			console.warn('[dev-user] Gagal mem-parse DEV_USER_JSON dari env, menggunakan variabel individual:', e);
		}
	}

	const id = privateEnv.DEV_USER_ID || 'dev-local-user-id';
	const email = privateEnv.DEV_USER_EMAIL || 'dev@local.test';
	const name = privateEnv.DEV_USER_NAME || 'Developer';
	const avatarUrl = privateEnv.DEV_USER_AVATAR_URL || '';

	const metadata: UserMetaData = {
		iss: 'https://accounts.google.com',
		sub: id,
		name,
		full_name: name,
		email,
		picture: avatarUrl,
		avatar_url: avatarUrl,
		provider_id: id,
		email_verified: true,
		phone_verified: false
	};

	return {
		id,
		email,
		banned_until: null,
		created_at: new Date().toISOString(),
		confirmed_at: new Date().toISOString(),
		confirmation_sent_at: null,
		is_anonymous: false,
		is_sso_user: false,
		invited_at: null,
		last_sign_in_at: new Date().toISOString(),
		phone: null,
		raw_app_meta_data: {
			provider: 'google',
			providers: ['google']
		},
		raw_user_meta_data: metadata,
		user_metadata: metadata,
		app_metadata: {
			provider: 'google',
			providers: ['google']
		},
		aud: 'authenticated',
		role: 'authenticated',
		updated_at: new Date().toISOString(),
		providers: ['google']
	};
}
