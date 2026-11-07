import { json } from '@sveltejs/kit';
import { initiateStorageTransfer, isPersonalStorageEnabled } from '$lib/server/storage-ownership';
import type { RequestHandler } from './$types';
import type { User } from '@supabase/supabase-js';
import { isSameOrigin } from '$lib/server/same-origin';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!isSameOrigin(request, url)) return json({ success: false, error: { message: 'Permintaan tidak diizinkan' } }, { status: 403 });
	if (!locals.userId) return json({ success: false, error: { message: 'Silakan masuk kembali' } }, { status: 401 });
	if (!isPersonalStorageEnabled(locals.userId, locals.user?.email)) {
		return json({ success: false, error: { message: 'Fitur kepemilikan Google Drive pribadi dinonaktifkan' } }, { status: 403 });
	}
	try {
		return json({ success: true, data: await initiateStorageTransfer(locals.userId, locals.user as User | null) });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Transfer gagal';
		return json({ success: false, error: { message } }, { status: message.startsWith('Tunggu') ? 429 : 409 });
	}
};
