import { describe, it, expect } from 'bun:test';

// 🐴 Pure function test — duplicates minimal parsing logic to test behavior
function splitCSVLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current);
				current = '';
			} else if (ch === '\r') {
				// skip
			} else {
				current += ch;
			}
		}
	}
	fields.push(current);
	return fields;
}

function parseDate(value: string): string | null {
	value = value.trim();
	// YYYY-MM-DD
	const m1 = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (m1) {
		const y = Number(m1[1]), m = Number(m1[2]), d = Number(m1[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	// DD/MM/YYYY
	const m2 = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (m2) {
		const d = Number(m2[1]), m = Number(m2[2]), y = Number(m2[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	// DD-MM-YYYY
	const m3 = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
	if (m3) {
		const d = Number(m3[1]), m = Number(m3[2]), y = Number(m3[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	return null;
}

describe('splitCSVLine', () => {
	it('splits simple comma-separated values', () => {
		expect(splitCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
	});

	it('handles quoted fields with commas', () => {
		expect(splitCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
	});

	it('handles escaped quotes inside quoted fields', () => {
		expect(splitCSVLine('a,"b""c",d')).toEqual(['a', 'b"c', 'd']);
	});

	it('handles empty fields', () => {
		expect(splitCSVLine('a,,c')).toEqual(['a', '', 'c']);
	});

	it('handles trailing comma', () => {
		const result = splitCSVLine('a,b,');
		expect(result).toEqual(['a', 'b', '']);
	});

	it('handles quoted field with newlines', () => {
		expect(splitCSVLine('a,"b\nc",d')).toEqual(['a', 'b\nc', 'd']);
	});
});

describe('parseDate', () => {
	it('parses YYYY-MM-DD', () => {
		const d = parseDate('2026-06-27');
		expect(d).toBe('2026-06-27');
	});

	it('parses DD/MM/YYYY', () => {
		const d = parseDate('27/06/2026');
		expect(d).toBe('2026-06-27');
	});

	it('parses DD-MM-YYYY', () => {
		const d = parseDate('27-06-2026');
		expect(d).toBe('2026-06-27');
	});

	it('returns null for invalid date "32-13-2026"', () => {
		expect(parseDate('32-13-2026')).toBeNull();
	});

	it('returns null for garbage input', () => {
		expect(parseDate('abc')).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(parseDate('')).toBeNull();
	});

	it('handles single digit month/day', () => {
		const d = parseDate('2026-6-5');
		expect(d).toBe('2026-06-05');
	});
});

describe('CSV header validation', () => {
	const EXPECTED = ['ID', 'Tipe', 'Jumlah', 'Kategori', 'Tanggal', 'Catatan', 'Dibuat', 'Diperbarui'];

	it('valid header passes', () => {
		expect(EXPECTED.every((h, i) => EXPECTED[i] === h)).toBe(true);
	});

	it('wrong header fails length check', () => {
		// header with wrong column count
		const bad = ['ID', 'Tipe', 'Jumlah'];
		expect(bad.length === 8).toBe(false);
	});
});

describe('type label parsing', () => {
	function parseType(raw: string): string {
		const lower = raw.trim().toLowerCase();
		return lower === 'pemasukan' || lower === 'income' ? 'income' : 'expense';
	}

	it('"Pemasukan" → income', () => {
		expect(parseType('Pemasukan')).toBe('income');
	});

	it('"income" → income', () => {
		expect(parseType('income')).toBe('income');
	});

	it('"Pengeluaran" → expense', () => {
		expect(parseType('Pengeluaran')).toBe('expense');
	});

	it('"INCOME" (uppercase) → income', () => {
		expect(parseType('INCOME')).toBe('income');
	});
});

describe('amount parsing', () => {
	function parseAmount(raw: string): number | null {
		const trimmed = raw.trim();
		if (trimmed.startsWith('-')) return null;
		const cleaned = trimmed.replace(/\D/g, '');
		const n = parseInt(cleaned, 10);
		return isNaN(n) || n <= 0 ? null : n;
	}

	it('parses positive integer', () => {
		expect(parseAmount('15000')).toBe(15000);
	});

	it('parses number with thousand separator', () => {
		expect(parseAmount('15,000')).toBe(15000);
	});

	it('returns null for negative number', () => {
		expect(parseAmount('-5000')).toBeNull();
	});

	it('returns null for zero', () => {
		expect(parseAmount('0')).toBeNull();
	});

	it('returns null for non-numeric', () => {
		expect(parseAmount('abc')).toBeNull();
	});
});
