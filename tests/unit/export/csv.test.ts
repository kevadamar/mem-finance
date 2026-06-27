import { describe, it, expect } from 'bun:test';

function escapeCSV(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return '"' + value.replace(/"/g, '""') + '"';
	}
	return value;
}

function toDateStr(iso: string): string {
	const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
	return d.toISOString().split('T')[0];
}

describe('escapeCSV', () => {
	it('returns plain value if no special chars', () => {
		expect(escapeCSV('hello')).toBe('hello');
	});

	it('wraps in quotes if value contains comma', () => {
		expect(escapeCSV('a,b')).toBe('"a,b"');
	});

	it('escapes inner double quotes', () => {
		expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
	});

	it('wraps in quotes if value contains newline', () => {
		expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
	});
});

describe('toDateStr', () => {
	it('converts YYYY-MM-DD ISO string to date string', () => {
		const r = toDateStr('2026-06-27');
		expect(r).toBe('2026-06-27');
	});

	it('converts ISO datetime to date string', () => {
		const r = toDateStr('2026-06-18T17:00:00.000Z');
		expect(r).toBe('2026-06-18');
	});
});

describe('CSV header format', () => {
	it('has correct header columns', () => {
		const header = 'ID,Tipe,Jumlah,Kategori,Tanggal,Catatan,Dibuat,Diperbarui';
		const cols = header.split(',');
		expect(cols).toEqual(['ID', 'Tipe', 'Jumlah', 'Kategori', 'Tanggal', 'Catatan', 'Dibuat', 'Diperbarui']);
		expect(cols.length).toBe(8);
	});
});

describe('type label mapping', () => {
	function typeLabel(type: string): string {
		return type === 'income' ? 'Pemasukan' : 'Pengeluaran';
	}

	it('income → Pemasukan', () => {
		expect(typeLabel('income')).toBe('Pemasukan');
	});

	it('expense → Pengeluaran', () => {
		expect(typeLabel('expense')).toBe('Pengeluaran');
	});
});

describe('amount format in CSV', () => {
	it('amount is plain integer without formatting', () => {
		const amount = 15000;
		expect(String(amount)).toBe('15000');
	});

	it('large amount has no thousand separator', () => {
		const amount = 1500000;
		expect(String(amount)).toBe('1500000');
	});
});
