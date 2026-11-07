import { createSupabaseServerClient } from '$lib/server/auth';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { isPersonalStorageEnabled, type StorageStatus } from '$lib/server/storage-ownership';
import { gasRequest } from '$lib/data/gas/gas-client';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/healthz'];
const APP_SCHEMA = 'memfinance';

function getPrivateEnv(name: string): string {
	return privateEnv[name] ?? '';
}

type SheetProfile = { id: string | null; status: StorageStatus; targetEmail: string | null };
const setupError: SheetProfile = { id: null, status: 'SETUP_ERROR', targetEmail: null };

async function getSheetProfile(userId: string, email: string): Promise<SheetProfile> {
	const serviceRoleKey = getPrivateEnv('SUPABASE_SERVICE_ROLE_KEY');
	if (!PUBLIC_SUPABASE_URL || !serviceRoleKey) {
		console.error('[hooks] Missing Supabase URL or service role key; cannot create user profile');
		return setupError;
	}

	try {
		const adminClient = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false
			}
		});

		// Mode 1: Pre-enhancement (Classic admin-managed sheet mode)
		// When personal storage is disabled, skip all storage ownership/status queries.
		if (!isPersonalStorageEnabled(userId, email)) {
			const { data: legacyProfile } = await adminClient
				.schema(APP_SCHEMA)
				.from('user_profiles')
				.select('ga_sheet_id')
				.eq('id', userId)
				.maybeSingle();

			if (legacyProfile?.ga_sheet_id) {
				return { id: legacyProfile.ga_sheet_id, status: 'ADMIN_OWNED', targetEmail: null };
			}

			// Upsert profile record
			await adminClient
				.schema(APP_SCHEMA)
				.from('user_profiles')
				.upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true });

			// Provision admin spreadsheet via GAS
			const gasRes = await gasRequest<{ gaSheetId: string }>('create_sheet', '', { userId });
			if (gasRes.success && gasRes.data?.gaSheetId) {
				await adminClient
					.schema(APP_SCHEMA)
					.from('user_profiles')
					.update({ ga_sheet_id: gasRes.data.gaSheetId, updated_at: new Date().toISOString() })
					.eq('id', userId);
				return { id: gasRes.data.gaSheetId, status: 'ADMIN_OWNED', targetEmail: null };
			}

			return { id: null, status: 'ADMIN_OWNED', targetEmail: null };
		}

		// Mode 2: Enhanced mode (User-owned Google Drive storage delegation)
		const { data: profile, error: selectError } = await adminClient
			.schema(APP_SCHEMA)
			.from('user_profiles')
			.select('ga_sheet_id,storage_status,google_owner_email')
			.eq('id', userId)
			.maybeSingle();

		if (selectError) {
			// Backward compatibility: If migration 20261102_storage_ownership.sql hasn't been run yet in Supabase (code 42703)
			if (selectError.code === '42703' || selectError.message?.includes('storage_status')) {
				const { data: legacyProfile, error: legacyError } = await adminClient
					.schema(APP_SCHEMA)
					.from('user_profiles')
					.select('ga_sheet_id')
					.eq('id', userId)
					.maybeSingle();

				if (legacyError) {
					throw new Error(`Failed to read legacy user profile: ${legacyError.message}`);
				}

				if (legacyProfile) {
					return {
						id: legacyProfile.ga_sheet_id,
						status: legacyProfile.ga_sheet_id ? 'ADMIN_OWNED' : 'CHOICE_REQUIRED',
						targetEmail: null
					};
				}

				const { error: upsertError } = await adminClient
					.schema(APP_SCHEMA)
					.from('user_profiles')
					.upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true });

				if (upsertError) {
					throw new Error(`Failed to upsert legacy user profile: ${upsertError.message}`);
				}

				return { id: null, status: 'CHOICE_REQUIRED', targetEmail: null };
			}

			throw new Error(`Failed to read user profile: ${selectError.message}`);
		}

		if (profile) {
			const status = (profile.storage_status as StorageStatus) || (profile.ga_sheet_id ? 'ADMIN_OWNED' : 'CHOICE_REQUIRED');
			return { id: profile.ga_sheet_id, status, targetEmail: profile.google_owner_email };
		}

		const { error: upsertError } = await adminClient
			.schema(APP_SCHEMA)
			.from('user_profiles')
			.upsert({ id: userId, email, storage_status: 'CHOICE_REQUIRED' }, { onConflict: 'id', ignoreDuplicates: true });

		if (upsertError) {
			throw new Error(`Failed to upsert user profile: ${upsertError.message}`);
		}

		return { id: null, status: 'CHOICE_REQUIRED', targetEmail: null };
	} catch (err) {
		console.error('[hooks] getSheetProfile failed:', err instanceof Error ? err.message : err);
		return setupError;
	}

	return setupError;
}

import { getDevUser } from '$lib/server/dev-user';

export const handle: Handle = async ({ event, resolve }) => {
	const authDisabled = dev && getPrivateEnv('FORCE_AUTH_DISABLED') === 'true';
	const path = event.url.pathname;
	const privateApi = path.startsWith('/api/');
	const dataApi = /^\/api\/(transactions|categories|budgets)(\/|$)/.test(path);

	// With no Supabase configuration there is no session to read. When auth is
	// disabled, however, we still read an existing session so public routes can
	// make the right UX decision (for example, sending a signed-in visitor from
	// /login to /dashboard); only protected-route enforcement is skipped.
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		if (authDisabled) {
			const devUser = getDevUser();
			event.locals.userId = devUser.id;
			event.locals.user = devUser as unknown as import('@supabase/supabase-js').User;
			return resolve(event);
		}
		if (privateApi) return json({ success: false, data: null, error: { code: 'AUTH_UNAVAILABLE', message: 'Authentication is unavailable' } }, { status: 503 });
		if (path !== '/' && !PUBLIC_PATHS.some((p) => path.startsWith(p))) throw redirect(303, '/login');
		return resolve(event);
	}

	const supabase = createSupabaseServerClient(event);
	event.locals.supabase = supabase;

	// Refreshes an expiring cookie session before checking the user. `getUser`
	// verifies the identity with Supabase Auth, unlike an unverified cookie read.
	await supabase.auth.getSession();
	const { data: userData } = await supabase.auth.getUser();

	if (userData.user) {
		const userId = userData.user.id;
		event.locals.userId = userId;
		event.locals.user = userData.user;
		const sheet = await getSheetProfile(userId, userData.user.email || '');
		event.locals.gaSheetId = sheet.id;
		event.locals.storageStatus = sheet.status;
		event.locals.googleOwnerEmail = sheet.targetEmail;
	} else if (authDisabled) {
		const devUser = getDevUser();
		event.locals.userId = devUser.id;
		event.locals.user = devUser as unknown as import('@supabase/supabase-js').User;
		try {
			const sheet = await getSheetProfile(devUser.id, devUser.email);
			event.locals.gaSheetId = sheet.id;
			event.locals.storageStatus = sheet.status;
			event.locals.googleOwnerEmail = sheet.targetEmail;
		} catch {
			// Fallback safely if external services are unreachable
		}
	} else {
		const isProtected = path !== '/' && !PUBLIC_PATHS.some((p) => path.startsWith(p));
		if (!authDisabled && isProtected) {
			if (privateApi) return json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Please sign in' } }, { status: 401 });
			throw redirect(303, '/login');
		}
	}
	if (privateApi && !event.locals.userId) return json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Please sign in' } }, { status: 401 });
	if (dataApi) {
		const ownerId = event.request.headers.get('x-memfinance-user-id');
		if (!ownerId || ownerId !== event.locals.userId) return json({ success: false, data: null, error: { code: 'ACCOUNT_CHANGED', message: 'Account changed; reload the app' } }, { status: 409 });
		const personalEnabled = isPersonalStorageEnabled(event.locals.userId, event.locals.user?.email);
		if (!event.locals.gaSheetId || (personalEnabled && !['ADMIN_OWNED', 'TRANSFER_PENDING', 'USER_OWNED_ADMIN_EDITOR'].includes(event.locals.storageStatus ?? ''))) {
			return json({ success: false, data: null, error: { code: 'SHEET_UNAVAILABLE', message: 'Spreadsheet is not ready' } }, { status: 503 });
		}
	}

	return resolve(event);
};
