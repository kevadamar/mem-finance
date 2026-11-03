import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.userId) return json({ error: 'Unauthorized' }, { status: 401 });
	return json({ userId: locals.userId }, { headers: { 'Cache-Control': 'no-store' } });
};
