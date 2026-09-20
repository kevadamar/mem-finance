import type { ParsedReceiptData } from './receiptParser';

export function buildReceiptParserMessage(userText: string, extracted: ParsedReceiptData): string {
	const cleanUserText = userText.trim();
	const amountText = extracted.totalAmount === null
		? ''
		: `belanja struk ${Math.round(extracted.totalAmount)}`;
	const rawText = extracted.rawText.trim();

	return [
		cleanUserText || 'belanja struk dari gambar',
		amountText,
		rawText ? `Teks OCR struk:\n${rawText}` : ''
	].filter(Boolean).join('\n');
}
