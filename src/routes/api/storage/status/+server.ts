import { json } from '@sveltejs/kit';
import { verifyStorage } from '$lib/server/storage-ownership';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.userId) return json({ success: false, error: { message: 'Silakan masuk kembali' } }, { status: 401 });
	try {
		return json({ success: true, data: await verifyStorage(locals.userId) });
	} catch {
		return json({ success: false, error: { message: 'Status Google Drive belum dapat diperiksa. Coba lagi nanti.' } }, { status: 503 });
	}
};
