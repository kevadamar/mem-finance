import { describe, expect, it } from 'bun:test';

// Simulation of Google Apps Script Sheet environment
class MockSheet {
	headers: string[];
	rows: (string | number | boolean)[][];

	constructor(headers = ['id', 'type', 'amount', 'categoryId', 'date', 'note', 'createdAt', 'updatedAt', 'flagActive', 'userId']) {
		this.headers = headers;
		this.rows = [headers];
	}

	getDataRange() {
		return {
			getValues: () => this.rows
		};
	}

	appendRow(row: (string | number | boolean)[]) {
		this.rows.push([...row]);
	}
}

// Simulates TransactionService logic as implemented in gas/TransactionService.gs
class SimulatedGasTransactionService {
	static HEADERS = ['id', 'type', 'amount', 'categoryId', 'date', 'note', 'createdAt', 'updatedAt', 'flagActive', 'userId'];

	static _formatDate(value: unknown) {
		if (value instanceof Date) {
			const y = value.getFullYear();
			const m = String(value.getMonth() + 1).padStart(2, '0');
			const d = String(value.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		}
		if (typeof value === 'string') {
			const parts = value.split('T')[0].split(' ')[0];
			if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) return parts;
		}
		return String(value);
	}

	static _toObj(headers: string[], row: (string | number | boolean)[]) {
		const obj: Record<string, unknown> = {};
		headers.forEach((h, i) => {
			obj[h] = h === 'date' ? this._formatDate(row[i]) : row[i];
		});
		return obj;
	}

	static create(sheet: MockSheet, data: { id?: string; type: string; amount: number; categoryId: string; date: string; note?: string; createdAt?: string; userId?: string }) {
		const rows = sheet.getDataRange().getValues();
		const headers = (rows[0] as string[]) || this.HEADERS;

		// Idempotent retry: if client provided id and it already exists, return existing row
		if (data.id) {
			for (let i = 1; i < rows.length; i++) {
				if (rows[i][0] === data.id) {
					return this._toObj(headers, rows[i]);
				}
			}
		}

		const now = new Date().toISOString();
		const createdAt = data.createdAt || now;
		const id = data.id || `gas_gen_${Math.random().toString(36).slice(2, 9)}`;
		const row = [id, data.type, Number(data.amount), data.categoryId, data.date, data.note || '', createdAt, now, true, data.userId || 'default-admin'];
		sheet.appendRow(row);
		const obj: Record<string, unknown> = {};
		this.HEADERS.forEach((h, i) => {
			obj[h] = h === 'date' ? this._formatDate(row[i]) : row[i];
		});
		return obj;
	}
}

describe('GAS TransactionService - Idempotency & Lost Response Simulation', () => {
	it('creates new transaction row with stable client id', () => {
		const sheet = new MockSheet();
		const clientDraftId = 'client-stable-uuid-1';

		const result = SimulatedGasTransactionService.create(sheet, {
			id: clientDraftId,
			type: 'expense',
			amount: 35000,
			categoryId: 'cat-makan',
			date: '2026-11-03',
			note: 'Makan siang'
		});

		expect(result.id).toBe(clientDraftId);
		expect(result.amount).toBe(35000);
		expect(sheet.rows.length).toBe(2); // 1 header + 1 data row
	});

	it('returns existing transaction on retry when first write succeeded but client lost response', () => {
		const sheet = new MockSheet();
		const clientDraftId = 'client-stable-uuid-retry';

		// First write succeeds on server
		const firstResult = SimulatedGasTransactionService.create(sheet, {
			id: clientDraftId,
			type: 'expense',
			amount: 50000,
			categoryId: 'cat-transport',
			date: '2026-11-03',
			note: 'Bensin'
		});

		expect(sheet.rows.length).toBe(2);

		// Client network dropped, client retries with the SAME draft.id
		const retryResult = SimulatedGasTransactionService.create(sheet, {
			id: clientDraftId,
			type: 'expense',
			amount: 50000,
			categoryId: 'cat-transport',
			date: '2026-11-03',
			note: 'Bensin'
		});

		// Sheet still only has 1 transaction row (NO duplicate created!)
		expect(sheet.rows.length).toBe(2);
		expect(retryResult.id).toBe(clientDraftId);
		expect(retryResult.amount).toBe(firstResult.amount);
		expect(retryResult.createdAt).toBe(firstResult.createdAt);
	});

	it('creates two distinct transactions for two separate drafts with identical contents', () => {
		const sheet = new MockSheet();
		const draftId1 = 'draft-uuid-aaa';
		const draftId2 = 'draft-uuid-bbb';

		// Draft 1
		const tx1 = SimulatedGasTransactionService.create(sheet, {
			id: draftId1,
			type: 'expense',
			amount: 35000,
			categoryId: 'cat-makan',
			date: '2026-11-03',
			note: 'Makan siang'
		});

		// Draft 2 (same amount, category, date, note, but distinct draft id)
		const tx2 = SimulatedGasTransactionService.create(sheet, {
			id: draftId2,
			type: 'expense',
			amount: 35000,
			categoryId: 'cat-makan',
			date: '2026-11-03',
			note: 'Makan siang'
		});

		expect(sheet.rows.length).toBe(3); // 1 header + 2 data rows
		expect(tx1.id).toBe(draftId1);
		expect(tx2.id).toBe(draftId2);
	});

	it('falls back to auto-generated id if client does not provide data.id (backward compatibility)', () => {
		const sheet = new MockSheet();

		const result = SimulatedGasTransactionService.create(sheet, {
			type: 'income',
			amount: 5000000,
			categoryId: 'cat-gaji',
			date: '2026-11-03'
		});

		expect(result.id).toBeDefined();
		expect(sheet.rows.length).toBe(2);
	});
});
