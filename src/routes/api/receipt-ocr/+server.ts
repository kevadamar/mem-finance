import { json } from '@sveltejs/kit';
import { runtimeEnv } from '$lib/server/env';
import { requestLimit } from '$lib/server/request-limit';
import { isSameOrigin } from '$lib/server/same-origin';
import { parseReceiptOcr, type OCRItem, type OCRResponse, type ParsedReceiptData } from '$lib/utils/receiptParser';
import type { RequestHandler } from './$types';

interface ReceiptOCRSuccessResponse {
	success: true;
	ocr: OCRResponse;
	extracted: ParsedReceiptData;
}

interface ReceiptOCRErrorResponse {
	success: false;
	error: {
		code: 'NO_FILE' | 'UNSUPPORTED_FORMAT' | 'FILE_TOO_LARGE' | 'OCR_TIMEOUT' | 'OCR_SERVICE_ERROR' | 'INVALID_OCR_RESPONSE';
		message: string;
	};
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!isSameOrigin(request, url)) return errorResponse('OCR_SERVICE_ERROR', 'Permintaan tidak diizinkan.', 403);
	if (!locals.userId) return errorResponse('OCR_SERVICE_ERROR', 'Silakan masuk kembali.', 401);
	const retryAfter = requestLimit(`ocr:${locals.userId}`, 10, 60_000);
	if (retryAfter) return json({ success: false, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan OCR.' } }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
	if (Number(request.headers.get('content-length') ?? 0) > runtimeEnv.receiptOcrMaxUploadBytes + 64 * 1024) {
		return errorResponse('FILE_TOO_LARGE', 'File terlalu besar.', 413);
	}
	if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return errorResponse('NO_FILE', 'Pilih file struk terlebih dahulu.', 400);
	let formData: FormData;
	try { formData = await request.formData(); }
	catch { return errorResponse('NO_FILE', 'Formulir unggahan tidak valid.', 400); }
	const file = formData.get('file');

	if (!(file instanceof File) || file.size === 0) {
		return errorResponse('NO_FILE', 'Pilih file struk terlebih dahulu.', 400);
	}

	if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
		return errorResponse('UNSUPPORTED_FORMAT', 'Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP.', 415);
	}

	if (file.size > runtimeEnv.receiptOcrMaxUploadBytes) {
		const maxMb = Math.floor(runtimeEnv.receiptOcrMaxUploadBytes / 1024 / 1024);
		return errorResponse('FILE_TOO_LARGE', `File terlalu besar. Maksimum ${maxMb}MB.`, 413);
	}

	const outboundForm = new FormData();
	outboundForm.append('file', file, file.name || 'receipt-image');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), runtimeEnv.receiptOcrTimeoutMs);

	try {
		const response = await fetch(runtimeEnv.receiptOcrServiceUrl, {
			method: 'POST',
			body: outboundForm,
			signal: controller.signal
		});

		if (!response.ok) {
			let upstreamMessage: string | null = null;
			try {
				const upstreamJson = (await response.json()) as { message?: string };
				if (typeof upstreamJson?.message === 'string') upstreamMessage = upstreamJson.message;
			} catch {
				// Ignore non-JSON upstream response
			}

			if (response.status === 504 || upstreamMessage?.includes('timed out')) {
				return errorResponse('OCR_TIMEOUT', 'Pemrosesan OCR melewati batas waktu di server. Coba potong gambar lebih fokus ke area total atau ketik manual.', 504);
			}

			return errorResponse('OCR_SERVICE_ERROR', upstreamMessage || 'Layanan OCR belum dapat memproses struk ini.', 502);
		}

		const payload: unknown = await response.json();
		if (!isOCRResponse(payload)) {
			return errorResponse('INVALID_OCR_RESPONSE', 'Response OCR tidak sesuai format yang diharapkan.', 502);
		}

		return json({
			success: true,
			ocr: payload,
			extracted: parseReceiptOcr(payload.data)
		} satisfies ReceiptOCRSuccessResponse);
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			return errorResponse('OCR_TIMEOUT', 'Pemrosesan OCR melewati batas waktu. Coba unggah ulang dengan gambar yang lebih jelas.', 504);
		}

		return errorResponse('OCR_SERVICE_ERROR', 'Layanan OCR sedang tidak tersedia.', 502);
	} finally {
		clearTimeout(timeout);
	}
};

function errorResponse(
	code: ReceiptOCRErrorResponse['error']['code'],
	message: string,
	status: number
) {
	return json(
		{
			success: false,
			error: { code, message }
		} satisfies ReceiptOCRErrorResponse,
		{ status }
	);
}

function isOCRResponse(value: unknown): value is OCRResponse {
	if (!value || typeof value !== 'object') return false;

	const candidate = value as Partial<OCRResponse>;
	return (
		typeof candidate.status === 'string' &&
		typeof candidate.message === 'string' &&
		Array.isArray(candidate.data) &&
		candidate.data.every(isOCRItem)
	);
}

function isOCRItem(value: unknown): value is OCRItem {
	if (!value || typeof value !== 'object') return false;

	const candidate = value as Partial<OCRItem>;
	return (
		typeof candidate.text === 'string' &&
		typeof candidate.confidence === 'number' &&
		Array.isArray(candidate.box) &&
		candidate.box.every((point) => Array.isArray(point) && point.length === 2 && point.every((axis) => typeof axis === 'number'))
	);
}
