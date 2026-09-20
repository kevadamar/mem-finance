import { env } from '$env/dynamic/private';

function requireEnv(name: string): string {
	const value = env[name];
	if (!value || value.trim() === '') {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const runtimeEnv = {
	get gasWebappUrl() {
		return requireEnv('GAS_WEBAPP_URL');
	},
	geminiApiKey: env.GEMINI_API_KEY ?? '',
	groqApiKey: env.GROQ_API_KEY ?? '',
	host: env.HOST ?? '0.0.0.0',
	port: Number(env.PORT ?? '3000'),
	receiptOcrServiceUrl: env.RECEIPT_OCR_SERVICE_URL ?? 'http://python-ocr-service:8000/api/ocr',
	receiptOcrTimeoutMs: Number(env.RECEIPT_OCR_TIMEOUT_MS ?? '35000'),
	receiptOcrMaxUploadBytes: Number(env.RECEIPT_OCR_MAX_UPLOAD_BYTES ?? String(10 * 1024 * 1024)),
};
