import { json } from '@sveltejs/kit';
import { gasRequest } from '$lib/data/gas/gas-client';
import { validateTransaction } from '$lib/domain/validators/transaction.validator';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const params: Record<string, string> = {};
	for (const [key, value] of url.searchParams) params[key] = value;

	const result = await gasRequest('list', 'transactions', { ...params, sheetId: locals.gaSheetId, userId: locals.userId });
	return json(result, { status: result.success ? 200 : 502 });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();

	const validation = validateTransaction(body);
	if (!validation.valid) {
		return json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: validation.errors } }, { status: 400 });
	}

	const result = await gasRequest('create', 'transactions', { ...body, sheetId: locals.gaSheetId, userId: locals.userId });
	return json(result, { status: result.success ? 201 : 502 });
};
