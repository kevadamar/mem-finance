import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createStorageIntent } from '$lib/server/storage-consent';
import { isPersonalStorageEnabled } from '$lib/server/storage-ownership';
import type { RequestHandler } from './$types';
import { isSameOrigin } from '$lib/server/same-origin';

export const POST: RequestHandler = async ({ locals, cookies, request, url }) => {
	if (!isSameOrigin(request, url)) return json({ success: false, error: { message: 'Permintaan tidak diizinkan' } }, { status: 403 });
	if (!locals.userId) return json({ success: false, error: { message: 'Silakan masuk kembali' } }, { status: 401 });
	if (!isPersonalStorageEnabled(locals.userId, locals.user?.email)) {
		return json({ success: false, error: { message: 'Fitur kepemilikan Google Drive pribadi dinonaktifkan' } }, { status: 403 });
	}
	cookies.set('memfinance_storage_intent', createStorageIntent(locals.userId), {
		path: '/auth/callback', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: 600
	});
	return json({ success: true });
};
