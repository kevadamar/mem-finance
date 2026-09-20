import { describe, expect, it } from 'bun:test';
import { extractTotalAmount, parseCurrencyAmount, parseReceiptOcr, type OCRItem } from '../../src/lib/utils/receiptParser';

function item(text: string, x: number, y: number, width = 80, height = 20, confidence = 0.95): OCRItem {
	return {
		text,
		confidence,
		box: [
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height]
		]
	};
}

describe('parseReceiptOcr', () => {
	it('rejects subtotal lines and extracts the strict TOTAL same-line amount', () => {
		const result = parseReceiptOcr([
			item('Pre-discount Subtotal', 105, 605, 458, 46),
			item('18.200', 674, 606, 137, 54),
			item('Subtotal', 106, 662, 181, 47),
			item('18.200', 673, 662, 139, 57),
			item('PB 1', 105, 718, 101, 51),
			item('1.820', 690, 719, 120, 57),
			item('Pembulatan', 108, 768, 227, 56),
			item('-20', 728, 777, 82, 59),
			item('TOTAL', 109, 824, 119, 58, 0.99),
			item('20.000', 663, 826, 145, 63, 0.99)
		]);

		expect(result.totalAmount).toBe(20000);
		expect(result.totalAmountText).toBe('20.000');
		expect(result.totalKeyword).toBe('TOTAL');
	});

	it('prioritizes the right-most amount when multiple numbers appear on the total line', () => {
		const total = extractTotalAmount([
			item('TOTAL', 20, 100),
			item('1 Items', 180, 100),
			item('Rp 42.500', 320, 100)
		]);

		expect(total?.value).toBe(42500);
		expect(total?.text).toBe('Rp 42.500');
	});

	it('uses the amount immediately below a strict total keyword when same-line is empty', () => {
		const result = parseReceiptOcr([
			item('TOTAL BAYAR', 20, 100, 160, 24),
			item('Rp 128.000', 220, 132, 140, 24),
			item('Change', 20, 220),
			item('Rp 2.000', 220, 220)
		]);

		expect(result.totalAmount).toBe(128000);
		expect(result.totalKeyword).toBe('TOTAL BAYAR');
	});

	it('does not fall back to arbitrary highest amounts without a valid total keyword', () => {
		const result = parseReceiptOcr([
			item('Kopi', 20, 100),
			item('18.000', 220, 100),
			item('Roti', 20, 125),
			item('25.000', 220, 125)
		]);

		expect(result.totalAmount).toBeNull();
		expect(result.totalKeyword).toBeNull();
	});

	it('rejects total-like false positives such as total item', () => {
		const result = parseReceiptOcr([
			item('TOTAL ITEM', 20, 100),
			item('3', 220, 100),
			item('AMOUNT DUE', 20, 140),
			item('20.000', 220, 140)
		]);

		expect(result.totalAmount).toBe(20000);
		expect(result.totalKeyword).toBe('AMOUNT DUE');
	});
});

describe('parseCurrencyAmount', () => {
	it('parses Indonesian and mixed currency formats', () => {
		expect(parseCurrencyAmount('Rp 20.000')).toBe(20000);
		expect(parseCurrencyAmount('IDR 20.000')).toBe(20000);
		expect(parseCurrencyAmount('20,000.00')).toBe(20000);
		expect(parseCurrencyAmount('20.000,00')).toBe(20000);
	});

	it('ignores negative amounts used for rounding or discounts', () => {
		expect(parseCurrencyAmount('-20')).toBeNull();
	});
});
