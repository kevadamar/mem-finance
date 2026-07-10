import { createSupabaseServerClient } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { FORCE_AUTH_DISABLED, SUPABASE_SERVICE_ROLE_KEY, GAS_SHARED_SECRET } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/healthz'];

function signForCreateSheet(userId: string): { signature: string; timestamp: number } {
	const action = 'create_sheet';
	const timestamp = Math.floor(Date.now() / 1000);
	const toSign = JSON.stringify({ action, table: '', data: { userId }, timestamp });
	const signature = createHmac('sha256', GAS_SHARED_SECRET).update(toSign).digest('hex');
	return { signature, timestamp };
}

async function getOrCreateGaSheetId(userId: string, email: string): Promise<string | null> {
	if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

	try {
		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

		const { data: profile } = await adminClient
			.schema('memnance')
			.from('user_profiles')
			.select('ga_sheet_id')
			.eq('id', userId)
			.single();

		if (profile?.ga_sheet_id) return profile.ga_sheet_id;

		await adminClient
			.schema('memnance')
			.from('user_profiles')
			.upsert({ id: userId, email }, { onConflict: 'id' });

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
			await adminClient
				.schema('memnance')
				.from('user_profiles')
				.update({ ga_sheet_id: json.data.gaSheetId, updated_at: new Date().toISOString() })
				.eq('id', userId);
			return json.data.gaSheetId;
		}
	} catch { /* service unavailable, fallback to shared sheet */ }

	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	if (FORCE_AUTH_DISABLED === 'true' || !PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
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
		const isProtected = !PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p));
		if (isProtected) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};
