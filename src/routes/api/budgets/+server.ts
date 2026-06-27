import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await gasRequest('list', 'budgets');
	return json(result, { status: result.success ? 200 : 502 });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const result = await gasRequest('create', 'budgets', body);
	return json(result, { status: result.success ? 201 : 502 });
};
