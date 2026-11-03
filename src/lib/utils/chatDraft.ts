import type { Category } from '$lib/domain/entities/category';
import type { ParsedTransaction, TransactionDraft } from '$lib/domain/entities/chat';
import type { TransactionType } from '$lib/domain/entities/transaction';
import { validateTransaction } from '$lib/domain/validators/transaction.validator';

export function getTodayDateString(offsetDays = 0): string {
	const d = new Date();
	if (offsetDays !== 0) {
		d.setDate(d.getDate() + offsetDays);
	}
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function isValidDateString(dateStr: string | undefined): boolean {
	if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
	const d = new Date(dateStr);
	return !isNaN(d.getTime());
}

/**
 * Resolves category against ACTIVE categories only.
 * Returns null if no match or if ambiguous, requiring the user to explicitly select.
 */
export function resolveActiveCategory(
	categoryName: string,
	type: TransactionType,
	categories: Category[]
): Category | null {
	if (!categoryName?.trim()) return null;

	const active = categories.filter((c) => c.flagActive !== false && c.type === type);
	if (active.length === 0) return null;

	const query = categoryName.trim().toLowerCase();

	// 1. Exact match (case-insensitive)
	const exact = active.find((c) => c.name.toLowerCase() === query);
	if (exact) return exact;

	// 2. Direct substring match (c.name contains query OR query contains c.name)
	const substringMatches = active.filter(
		(c) =>
			c.name.toLowerCase().includes(query) ||
			query.includes(c.name.toLowerCase())
	);

	if (substringMatches.length === 1) {
		return substringMatches[0];
	}

	if (substringMatches.length > 1) {
		// Prefer the exact longest prefix/containment if one clearly dominates
		const sorted = [...substringMatches].sort((a, b) => b.name.length - a.name.length);
		// If query fully matches the start of one
		const prefixMatch = sorted.find((c) => query.startsWith(c.name.toLowerCase()) || c.name.toLowerCase().startsWith(query));
		if (prefixMatch) return prefixMatch;
		// Ambiguous - do not guess blindly
		return null;
	}

	// 3. Keyword / word stem token match (tokens with length >= 3)
	const queryTokens = query.split(/[\s&,/\\-]+/).filter((t) => t.length >= 3);
	if (queryTokens.length > 0) {
		const tokenMatches = active.filter((c) => {
			const cTokens = c.name.toLowerCase().split(/[\s&,/\\-]+/).filter((t) => t.length >= 3);
			return queryTokens.some((qt) => cTokens.some((ct) => ct.includes(qt) || qt.includes(ct)));
		});

		if (tokenMatches.length === 1) {
			return tokenMatches[0];
		}
	}

	// Ambiguous or not found
	return null;
}

export function createTransactionDraft(
	parsed: ParsedTransaction,
	categories: Category[],
	draftId?: string
): TransactionDraft {
	const id = draftId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
	const matched = resolveActiveCategory(parsed.category, parsed.type, categories);

	let date = parsed.date;
	if (!isValidDateString(date)) {
		date = getTodayDateString(0);
	}

	return {
		id,
		type: parsed.type,
		amount: Math.max(0, Math.round(parsed.amount || 0)),
		categoryId: matched ? matched.id : '',
		categoryName: matched ? matched.name : '',
		date,
		note: parsed.note?.trim() || undefined,
		status: 'draft',
		validationErrors: matched ? undefined : { categoryId: 'Pilih kategori transaksi' }
	};
}

export function validateDraft(
	draft: TransactionDraft,
	categories: Category[]
): { valid: boolean; errors: Record<string, string> } {
	const result = validateTransaction({
		id: draft.id,
		type: draft.type,
		amount: draft.amount,
		categoryId: draft.categoryId,
		date: draft.date,
		note: draft.note || null
	});

	const errors: Record<string, string> = {};
	for (const err of result.errors) {
		errors[err.field] = err.message;
	}

	if (draft.categoryId) {
		const category = categories.find((c) => c.id === draft.categoryId);
		if (!category || category.flagActive === false) {
			errors.categoryId = 'Kategori sudah tidak aktif. Silakan pilih kategori aktif.';
		} else if (category.type !== draft.type) {
			errors.categoryId = `Kategori bukan untuk ${draft.type === 'expense' ? 'pengeluaran' : 'pemasukan'}.`;
		}
	} else {
		errors.categoryId = 'Kategori wajib dipilih';
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors
	};
}
