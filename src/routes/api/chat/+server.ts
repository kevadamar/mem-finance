import { json } from '@sveltejs/kit';
import { parseMessage } from '$lib/data/parsers/parser-cascade';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { message } = await request.json();

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		return json({
			success: false,
			error: { code: 'EMPTY_MESSAGE', message: 'Pesan tidak boleh kosong' }
		}, { status: 400 });
	}

	try {
		const result = await parseMessage(message.trim());
		return json(result);
	} catch {
		return json({
			success: false,
			error: { code: 'LLM_UNAVAILABLE', message: 'Chatbot sedang tidak tersedia. Silakan input manual.' }
		}, { status: 502 });
	}
};
