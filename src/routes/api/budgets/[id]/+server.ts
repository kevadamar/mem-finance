import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const body = await request.json();
	const result = await gasRequest('update', 'budgets', { ...body, sheetId: locals.gaSheetId, userId: locals.userId }, params.id);
	if (!result.success) {
		return json(result, { status: result.error?.code === 'NOT_FOUND' ? 404 : 502 });
	}
	return json(result);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const result = await gasRequest('delete', 'budgets', { sheetId: locals.gaSheetId, userId: locals.userId }, params.id);
	if (!result.success) {
		return json(result, { status: result.error?.code === 'NOT_FOUND' ? 404 : 502 });
	}
	return json(result);
};
