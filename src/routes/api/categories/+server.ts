import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const result = await gasRequest('seed', 'categories');
	return json(result, { status: result.success ? 200 : 502 });
};
