import { describe, expect, test } from 'bun:test';
import { getBudgetCopyCandidates, getPreviousBudgetPeriod } from '$lib/utils/budget-copy';
import type { Budget } from '$lib/domain/entities/budget';

const budget = (overrides: Partial<Budget>): Budget => ({
	id: crypto.randomUUID(),
	categoryId: 'makan',
	amount: 500_000,
	month: 6,
	year: 2026,
	createdAt: '2026-06-01T00:00:00.000Z',
	...overrides
});

describe('getPreviousBudgetPeriod', () => {
	test('berpindah dari Januari ke Desember tahun sebelumnya', () => {
		expect(getPreviousBudgetPeriod({ month: 1, year: 2026 })).toEqual({ month: 12, year: 2025 });
	});
});

describe('getBudgetCopyCandidates', () => {
	test('menyalin hanya budget aktif yang belum ada pada periode target', () => {
		const candidates = getBudgetCopyCandidates([
			budget({ id: 'makan-juni', categoryId: 'makan', amount: 500_000 }),
			budget({ id: 'transport-juni', categoryId: 'transport', amount: 250_000 }),
			budget({ id: 'tagihan-nonaktif', categoryId: 'tagihan', flagActive: false }),
			budget({ id: 'makan-juli', categoryId: 'makan', amount: 700_000, month: 7 }),
			budget({ id: 'hiburan-juli-nonaktif', categoryId: 'hiburan', amount: 100_000, month: 7, flagActive: false }),
			budget({ id: 'hiburan-juni', categoryId: 'hiburan', amount: 150_000 })
		], { month: 6, year: 2026 }, { month: 7, year: 2026 });

		expect(candidates).toEqual([
			{ categoryId: 'transport', amount: 250_000, month: 7, year: 2026 }
		]);
	});

	test('menghindari kategori ganda dan periode sumber yang sama dengan target', () => {
		const budgets = [
			budget({ id: 'makan-pertama', categoryId: 'makan', amount: 500_000 }),
			budget({ id: 'makan-kedua', categoryId: 'makan', amount: 600_000 })
		];

		expect(getBudgetCopyCandidates(budgets, { month: 6, year: 2026 }, { month: 7, year: 2026 })).toEqual([
			{ categoryId: 'makan', amount: 500_000, month: 7, year: 2026 }
		]);
		expect(getBudgetCopyCandidates(budgets, { month: 6, year: 2026 }, { month: 6, year: 2026 })).toEqual([]);
	});
});
