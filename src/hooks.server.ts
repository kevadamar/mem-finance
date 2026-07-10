import { createSupabaseServerClient } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/healthz'];
const APP_SCHEMA = 'memfinance';

function getPrivateEnv(name: string): string {
	return privateEnv[name] ?? '';
}

function signForCreateSheet(userId: string): { signature: string; timestamp: number } {
	const action = 'create_sheet';
	const timestamp = Math.floor(Date.now() / 1000);
	const toSign = JSON.stringify({ action, table: '', data: { userId }, timestamp });
	const signature = createHmac('sha256', getPrivateEnv('GAS_SHARED_SECRET')).update(toSign).digest('hex');
	return { signature, timestamp };
}

async function getOrCreateGaSheetId(userId: string, email: string): Promise<string | null> {
	const serviceRoleKey = getPrivateEnv('SUPABASE_SERVICE_ROLE_KEY');
	if (!PUBLIC_SUPABASE_URL || !serviceRoleKey) {
		console.error('[hooks] Missing Supabase URL or service role key; cannot create user profile');
		return null;
	}

	try {
		const adminClient = createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false
			}
		});

		const { data: profile, error: selectError } = await adminClient
			.schema(APP_SCHEMA)
			.from('user_profiles')
			.select('ga_sheet_id')
			.eq('id', userId)
			.maybeSingle();

		if (selectError) {
			throw new Error(`Failed to read user profile: ${selectError.message}`);
		}

		if (profile?.ga_sheet_id) return profile.ga_sheet_id;

		const { error: upsertError } = await adminClient
			.schema(APP_SCHEMA)
			.from('user_profiles')
			.upsert({ id: userId, email }, { onConflict: 'id' });

		if (upsertError) {
			throw new Error(`Failed to upsert user profile: ${upsertError.message}`);
		}

		const { runtimeEnv } = await import('$lib/server/env');
		if (!runtimeEnv.gasWebappUrl) return null;

		const res = await fetch(runtimeEnv.gasWebappUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'create_sheet',
				table: '',
				data: { userId },
				...signForCreateSheet(userId)
			})
		});
		const json = await res.json();
		if (json.success && json.data?.gaSheetId) {
			const { error: updateError } = await adminClient
				.schema(APP_SCHEMA)
				.from('user_profiles')
				.update({ ga_sheet_id: json.data.gaSheetId, updated_at: new Date().toISOString() })
				.eq('id', userId);

			if (updateError) {
				throw new Error(`Failed to save Google Sheet ID: ${updateError.message}`);
			}

			return json.data.gaSheetId;
		}

		console.error('[hooks] create_sheet failed:', json.error ?? json);
	} catch (err) {
		console.error('[hooks] getOrCreateGaSheetId failed:', err instanceof Error ? err.message : err);
		return null;
	}

	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (getPrivateEnv('FORCE_AUTH_DISABLED') === 'true' || !PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		return resolve(event);
	}

	const supabase = createSupabaseServerClient(event);
	event.locals.supabase = supabase;

	const { data: claimsData } = await supabase.auth.getClaims();

	if (claimsData?.claims?.sub) {
		const userId = claimsData.claims.sub as string;
		event.locals.userId = userId;
		event.locals.gaSheetId = await getOrCreateGaSheetId(userId, (claimsData.claims.email as string) || '');
	} else {
		const isProtected = event.url.pathname !== '/' && !PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p));
		if (isProtected) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};
