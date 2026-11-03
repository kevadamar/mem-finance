import { describe, expect, it } from 'bun:test';
import {
	resolveActiveCategory,
	createTransactionDraft,
	validateDraft,
	getTodayDateString,
	isValidDateString
} from '../../../src/lib/utils/chatDraft';
import type { Category } from '../../../src/lib/domain/entities/category';
import type { ParsedTransaction, TransactionDraft } from '../../../src/lib/domain/entities/chat';

const mockCategories: Category[] = [
	{
		id: 'cat-makan',
		name: 'Makanan & Minuman',
		type: 'expense',
		color: '#ef4444',
		icon: 'utensils',
		isDefault: true,
		flagActive: true
	},
	{
		id: 'cat-transport',
		name: 'Transportasi',
		type: 'expense',
		color: '#3b82f6',
		icon: 'car',
		isDefault: true,
		flagActive: true
	},
	{
		id: 'cat-gaji',
		name: 'Gaji Bulanan',
		type: 'income',
		color: '#10b981',
		icon: 'briefcase',
		isDefault: true,
		flagActive: true
	},
	{
		id: 'cat-hiburan-old',
		name: 'Hiburan Lama',
		type: 'expense',
		color: '#8b5cf6',
		icon: 'gamepad',
		isDefault: false,
		flagActive: false // Inactive category
	},
	{
		id: 'cat-lainnya',
		name: 'Lainnya',
		type: 'expense',
		color: '#6b7280',
		icon: 'more',
		isDefault: true,
		flagActive: true
	}
];

describe('Transaction Draft - Category Resolution', () => {
	it('resolves exact active category name (case-insensitive)', () => {
		const matched = resolveActiveCategory('transportasi', 'expense', mockCategories);
		expect(matched).not.toBeNull();
		expect(matched?.id).toBe('cat-transport');
		expect(matched?.name).toBe('Transportasi');
	});

	it('resolves clear partial active category name', () => {
		const matched = resolveActiveCategory('makanan', 'expense', mockCategories);
		expect(matched).not.toBeNull();
		expect(matched?.id).toBe('cat-makan');
	});

	it('does NOT resolve to deactivated categories', () => {
		const matched = resolveActiveCategory('Hiburan Lama', 'expense', mockCategories);
		expect(matched).toBeNull();
	});

	it('does NOT match category across different transaction type', () => {
		// 'Gaji Bulanan' is income, should not match expense query
		const matched = resolveActiveCategory('Gaji Bulanan', 'expense', mockCategories);
		expect(matched).toBeNull();
	});

	it('does NOT silently fall back to "Lainnya" when query has no clear match', () => {
		const matched = resolveActiveCategory('Kacamata selam laut', 'expense', mockCategories);
		expect(matched).toBeNull();
	});
});

describe('Transaction Draft - Draft Creation & Isolation', () => {
	it('creates draft with stable UUID, parsed fields, and resolved active category', () => {
		const parsed: ParsedTransaction = {
			type: 'expense',
			amount: 35000,
			category: 'Makanan',
			date: '2026-11-03',
			note: 'Makan siang nasi padang',
			confidence: 0.95
		};

		const draft = createTransactionDraft(parsed, mockCategories);
		expect(draft.id).toBeDefined();
		expect(draft.type).toBe('expense');
		expect(draft.amount).toBe(35000);
		expect(draft.categoryId).toBe('cat-makan');
		expect(draft.categoryName).toBe('Makanan & Minuman');
		expect(draft.date).toBe('2026-11-03');
		expect(draft.note).toBe('Makan siang nasi padang');
		expect(draft.status).toBe('draft');
	});

	it('leaves category empty with validation flag if category is unresolved', () => {
		const parsed: ParsedTransaction = {
			type: 'expense',
			amount: 150000,
			category: 'Barang Antik Unik',
			date: '2026-11-03',
			confidence: 0.5
		};

		const draft = createTransactionDraft(parsed, mockCategories);
		expect(draft.categoryId).toBe('');
		expect(draft.categoryName).toBe('');
		expect(draft.validationErrors?.categoryId).toBeDefined();
	});

	it('isolates multiple drafts so modifying or cancelling draft 1 does not affect draft 2', () => {
		const parsed1: ParsedTransaction = {
			type: 'expense',
			amount: 35000,
			category: 'Makanan',
			date: '2026-11-03',
			note: 'Pesanan 1',
			confidence: 0.9
		};
		const parsed2: ParsedTransaction = {
			type: 'expense',
			amount: 35000,
			category: 'Makanan',
			date: '2026-11-03',
			note: 'Pesanan 2',
			confidence: 0.9
		};

		const draft1 = createTransactionDraft(parsed1, mockCategories);
		const draft2 = createTransactionDraft(parsed2, mockCategories);

		expect(draft1.id).not.toBe(draft2.id);

		// Modify draft 1
		const modifiedDraft1: TransactionDraft = {
			...draft1,
			date: '2026-11-02',
			amount: 40000,
			status: 'cancelled'
		};

		// Draft 2 remains unmodified
		expect(draft2.date).toBe('2026-11-03');
		expect(draft2.amount).toBe(35000);
		expect(draft2.status).toBe('draft');
		expect(modifiedDraft1.status).toBe('cancelled');
	});
});

describe('Transaction Draft - Validation Before Save', () => {
	it('passes validation for valid draft with active category', () => {
		const draft: TransactionDraft = {
			id: 'draft-1',
			type: 'expense',
			amount: 35000,
			categoryId: 'cat-makan',
			categoryName: 'Makanan & Minuman',
			date: getTodayDateString(0),
			status: 'draft'
		};

		const result = validateDraft(draft, mockCategories);
		expect(result.valid).toBe(true);
		expect(Object.keys(result.errors).length).toBe(0);
	});

	it('fails validation if category was deactivated before saving and retains draft values', () => {
		const draft: TransactionDraft = {
			id: 'draft-2',
			type: 'expense',
			amount: 50000,
			categoryId: 'cat-hiburan-old', // Inactive
			categoryName: 'Hiburan Lama',
			date: getTodayDateString(0),
			status: 'draft'
		};

		const result = validateDraft(draft, mockCategories);
		expect(result.valid).toBe(false);
		expect(result.errors.categoryId).toContain('tidak aktif');
	});

	it('fails validation if amount <= 0 or not an integer', () => {
		const draft: TransactionDraft = {
			id: 'draft-3',
			type: 'expense',
			amount: 0,
			categoryId: 'cat-makan',
			categoryName: 'Makanan & Minuman',
			date: getTodayDateString(0),
			status: 'draft'
		};

		const result = validateDraft(draft, mockCategories);
		expect(result.valid).toBe(false);
		expect(result.errors.amount).toBeDefined();
	});

	it('fails validation if note > 200 characters', () => {
		const draft: TransactionDraft = {
			id: 'draft-4',
			type: 'expense',
			amount: 25000,
			categoryId: 'cat-makan',
			categoryName: 'Makanan & Minuman',
			date: getTodayDateString(0),
			note: 'A'.repeat(201),
			status: 'draft'
		};

		const result = validateDraft(draft, mockCategories);
		expect(result.valid).toBe(false);
		expect(result.errors.note).toBeDefined();
	});
});

describe('Transaction Draft - Quick Date Helpers', () => {
	it('generates today and yesterday in YYYY-MM-DD format', () => {
		const today = getTodayDateString(0);
		const yesterday = getTodayDateString(-1);

		expect(isValidDateString(today)).toBe(true);
		expect(isValidDateString(yesterday)).toBe(true);
		expect(today).not.toBe(yesterday);
	});
});
