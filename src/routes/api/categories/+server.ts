import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await gasRequest('list', 'categories');
	if (result.success && Array.isArray(result.data) && result.data.length === 0) {
		const seedResult = await gasRequest('seed', 'categories');
		return json(seedResult, { status: seedResult.success ? 200 : 502 });
	}
	return json(result, { status: result.success ? 200 : 502 });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const result = await gasRequest('create', 'categories', body);
	return json(result, { status: result.success ? 201 : 502 });
};
