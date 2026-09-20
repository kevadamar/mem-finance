import { describe, expect, it } from 'bun:test';
import { buildReceiptParserMessage } from '../../src/lib/utils/receiptChatMessage';
import type { ParsedReceiptData } from '../../src/lib/utils/receiptParser';

function parsedReceipt(overrides: Partial<ParsedReceiptData> = {}): ParsedReceiptData {
	return {
		totalAmount: null,
		totalAmountText: null,
		totalKeyword: null,
		confidence: null,
		rawText: '',
		...overrides
	};
}

describe('buildReceiptParserMessage', () => {
	it('returns a non-empty fallback for image-only receipts with no OCR text', () => {
		expect(buildReceiptParserMessage('', parsedReceipt())).toBe('belanja struk dari gambar');
	});

	it('includes extracted total amount for image-only receipts', () => {
		expect(buildReceiptParserMessage('', parsedReceipt({ totalAmount: 42500 }))).toContain('belanja struk 42500');
	});

	it('preserves user text and OCR raw text when available', () => {
		const message = buildReceiptParserMessage('makan siang', parsedReceipt({ rawText: 'TOTAL\nRp 25.000' }));

		expect(message).toContain('makan siang');
		expect(message).toContain('Teks OCR struk:');
		expect(message).toContain('Rp 25.000');
	});
});
