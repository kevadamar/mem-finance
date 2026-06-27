export interface FieldError {
	field: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: FieldError[];
}

interface CreateTransactionInput {
	type?: string;
	amount?: number;
	categoryId?: string;
	date?: string;
	note?: string | null;
}

export function validateTransaction(input: CreateTransactionInput): ValidationResult {
	const errors: FieldError[] = [];

	if (!input.type || !['income', 'expense'].includes(input.type)) {
		errors.push({ field: 'type', message: 'Tipe transaksi wajib dipilih' });
	}

	if (input.amount === undefined || input.amount === null) {
		errors.push({ field: 'amount', message: 'Jumlah wajib diisi' });
	} else if (typeof input.amount !== 'number' || isNaN(input.amount)) {
		errors.push({ field: 'amount', message: 'Jumlah harus berupa angka' });
	} else if (input.amount <= 0) {
		errors.push({ field: 'amount', message: 'Jumlah harus lebih dari 0' });
	} else if (!Number.isInteger(input.amount)) {
		errors.push({ field: 'amount', message: 'Jumlah harus berupa bilangan bulat' });
	} else if (input.amount > 999999999) {
		errors.push({ field: 'amount', message: 'Jumlah maksimal Rp 999.999.999' });
	}

	if (!input.categoryId) {
		errors.push({ field: 'categoryId', message: 'Kategori wajib dipilih' });
	}

	if (!input.date) {
		errors.push({ field: 'date', message: 'Tanggal wajib diisi' });
	} else {
		const d = new Date(input.date);
		if (isNaN(d.getTime())) {
			errors.push({ field: 'date', message: 'Format tanggal tidak valid' });
		} else {
			const today = new Date();
			today.setHours(23, 59, 59, 999);
			if (d > today) {
				errors.push({ field: 'date', message: 'Tanggal tidak boleh di masa depan' });
			}
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			if (d < oneYearAgo) {
				errors.push({ field: 'date', message: 'Tanggal maksimal 1 tahun ke belakang' });
			}
		}
	}

	if (input.note && input.note.length > 200) {
		errors.push({ field: 'note', message: 'Catatan maksimal 200 karakter' });
	}

	return { valid: errors.length === 0, errors };
}
