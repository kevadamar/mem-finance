import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const result = await gasRequest('list', 'budgets', { sheetId: locals.gaSheetId });
	return json(result, { status: result.success ? 200 : 502 });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const result = await gasRequest('create', 'budgets', { ...body, sheetId: locals.gaSheetId });
	return json(result, { status: result.success ? 201 : 502 });
};
