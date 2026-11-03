import { json } from '@sveltejs/kit';
import { createAdminFallback } from '$lib/server/storage-ownership';
import type { RequestHandler } from './$types';
import { isSameOrigin } from '$lib/server/same-origin';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!isSameOrigin(request, url)) return json({ success: false, error: { message: 'Permintaan tidak diizinkan' } }, { status: 403 });
	if (!locals.userId) return json({ success: false, error: { message: 'Silakan masuk kembali' } }, { status: 401 });
	try {
		return json({ success: true, data: await createAdminFallback(locals.userId) });
	} catch {
		return json({ success: false, error: { message: 'Spreadsheet belum dapat disiapkan. Coba lagi nanti.' } }, { status: 503 });
	}
};
