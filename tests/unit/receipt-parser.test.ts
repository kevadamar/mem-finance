import { describe, expect, it } from 'bun:test';
import { parseReceiptOcr, type OCRItem } from '../../src/lib/utils/receiptParser';

function item(text: string, x: number, y: number, confidence = 0.95): OCRItem {
	return {
		text,
		confidence,
		box: [
			[x, y],
			[x + 80, y],
			[x + 80, y + 20],
			[x, y + 20]
		]
	};
}

describe('parseReceiptOcr', () => {
	it('extracts the highest amount on the same line as a total keyword', () => {
		const result = parseReceiptOcr([
			item('Subtotal', 20, 100),
			item('Rp 35.000', 220, 100),
			item('TOTAL', 20, 140),
			item('Rp 42.500', 220, 140)
		]);

		expect(result.totalAmount).toBe(42500);
		expect(result.totalKeyword).toBe('TOTAL');
	});

	it('uses the amount immediately below a total keyword', () => {
		const result = parseReceiptOcr([
			item('TOTAL', 20, 100),
			item('Rp 128.000', 220, 124),
			item('Change', 20, 220),
			item('Rp 2.000', 220, 220)
		]);

		expect(result.totalAmount).toBe(128000);
	});

	it('falls back to the highest amount when no keyword is detected', () => {
		const result = parseReceiptOcr([
			item('Kopi', 20, 100),
			item('18.000', 220, 100),
			item('Roti', 20, 125),
			item('25.000', 220, 125)
		]);

		expect(result.totalAmount).toBe(25000);
		expect(result.totalKeyword).toBeNull();
	});
});
