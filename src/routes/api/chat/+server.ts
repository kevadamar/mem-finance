import { json } from '@sveltejs/kit';
import { parseMessage } from '$lib/data/parsers/parser-cascade';
import { requestLimit } from '$lib/server/request-limit';
import { isSameOrigin } from '$lib/server/same-origin';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!isSameOrigin(request, url)) return json({ success: false, error: { code: 'FORBIDDEN', message: 'Permintaan tidak diizinkan' } }, { status: 403 });
	if (!locals.userId) return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Silakan masuk kembali' } }, { status: 401 });
	if (Number(request.headers.get('content-length') ?? 0) > 8192) return json({ success: false, error: { code: 'MESSAGE_TOO_LARGE', message: 'Pesan terlalu panjang' } }, { status: 413 });
	const retryAfter = requestLimit(`chat:${locals.userId}`, 30, 60_000);
	if (retryAfter) return json({ success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi nanti.' } }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
	let message: unknown;
	try { ({ message } = await request.json()); } catch { return json({ success: false, error: { code: 'INVALID_JSON', message: 'Permintaan tidak valid' } }, { status: 400 }); }

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		return json({
			success: false,
			error: { code: 'EMPTY_MESSAGE', message: 'Pesan tidak boleh kosong' }
		}, { status: 400 });
	}
	if (message.length > 4000) return json({ success: false, error: { code: 'MESSAGE_TOO_LARGE', message: 'Pesan terlalu panjang' } }, { status: 413 });

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
