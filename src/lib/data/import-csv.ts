import { getCategoryRepo, getTransactionRepo } from './repository-factory';
import { withDeferredSync } from './sync-manager';
import { getActiveUser } from './idb';
import type { TransactionType } from '$lib/domain/entities/transaction';
import type { ICategoryRepository } from '$lib/domain/repositories/category.repo';
import type { ITransactionRepository } from '$lib/domain/repositories/transaction.repo';

const EXPECTED_HEADERS = ['ID', 'Tipe', 'Jumlah', 'Kategori', 'Tanggal', 'Catatan', 'Dibuat', 'Diperbarui'];

export interface ParsedRow {
	type: TransactionType;
	amount: number;
	categoryName: string;
	date: string;
	note: string;
}

export interface ParseError {
	row: number;
	reason: string;
}

export interface ParseResult {
	rows: ParsedRow[];
	errors: ParseError[];
	summary: { total: number; valid: number; invalid: number; dateRange?: { start: string; end: string }; totalAmount: number };
}

export interface ImportReport {
	successCount: number;
	skipCount: number;
	errorCount: number;
	details: { entity?: string; id?: string; reason: string }[];
}

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
	const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (yyyymmdd) {
		const y = Number(yyyymmdd[1]), m = Number(yyyymmdd[2]), d = Number(yyyymmdd[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (ddmmyyyy) {
		const d = Number(ddmmyyyy[1]), m = Number(ddmmyyyy[2]), y = Number(ddmmyyyy[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	const ddmmmyyyy = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
	if (ddmmmyyyy) {
		const d = Number(ddmmmyyyy[1]), m = Number(ddmmmyyyy[2]), y = Number(ddmmmyyyy[3]);
		if (m < 1 || m > 12 || d < 1 || d > 31) return null;
		return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	return null;
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
	const text = await file.text();
	const cleaned = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
	const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);

	if (lines.length < 1) {
		return { rows: [], errors: [{ row: 0, reason: 'File kosong' }], summary: { total: 0, valid: 0, invalid: 0, totalAmount: 0 } };
	}

	const headerFields = splitCSVLine(lines[0]);
	const headerNorm = headerFields.map((h) => h.trim());
	if (headerNorm.length !== EXPECTED_HEADERS.length || !EXPECTED_HEADERS.every((h, i) => headerNorm[i] === h)) {
		return {
			rows: [],
			errors: [{ row: 0, reason: `Header tidak sesuai. Diharapkan: ${EXPECTED_HEADERS.join(', ')}` }],
			summary: { total: 0, valid: 0, invalid: 0, totalAmount: 0 }
		};
	}

	const rows: ParsedRow[] = [];
	const errors: ParseError[] = [];
	let minDate = '';
	let maxDate = '';
	let totalAmount = 0;

	for (let i = 1; i < lines.length; i++) {
		const fields = splitCSVLine(lines[i]);
		if (fields.length !== 8) {
			errors.push({ row: i + 1, reason: `Jumlah kolom tidak sesuai: diharapkan 8, didapat ${fields.length}` });
			continue;
		}

		const typeRaw = fields[1].trim().toLowerCase();
		const type: TransactionType = typeRaw === 'pemasukan' || typeRaw === 'income' ? 'income' : 'expense';

		const amountRaw = fields[2].trim();
		if (amountRaw.startsWith('-')) {
			errors.push({ row: i + 1, reason: 'Jumlah tidak boleh negatif' });
			continue;
		}
		const amount = parseInt(amountRaw.replace(/\D/g, ''), 10);
		if (isNaN(amount) || amount <= 0) {
			errors.push({ row: i + 1, reason: 'Jumlah tidak valid' });
			continue;
		}

		const parsedDate = parseDate(fields[4].trim());
		if (!parsedDate) {
			errors.push({ row: i + 1, reason: `Tanggal tidak valid: "${fields[4].trim()}"` });
			continue;
		}

		const categoryName = fields[3].trim();
		if (!categoryName) {
			errors.push({ row: i + 1, reason: 'Kategori tidak boleh kosong' });
			continue;
		}

		if (!minDate || parsedDate < minDate) minDate = parsedDate;
		if (!maxDate || parsedDate > maxDate) maxDate = parsedDate;
		totalAmount += amount;

		rows.push({ type, amount, categoryName, date: parsedDate, note: fields[5].trim() });
	}

	return {
		rows,
		errors,
		summary: {
			total: lines.length - 1,
			valid: rows.length,
			invalid: errors.length,
			dateRange: minDate ? { start: minDate, end: maxDate } : undefined,
			totalAmount
		}
	};
}

type CSVRepositories = { categoryRepo: Pick<ICategoryRepository, 'getAll' | 'create'>; transactionRepo: Pick<ITransactionRepository, 'create'> };

export async function executeCSVImport(rows: ParsedRow[], repositories: CSVRepositories = { categoryRepo: getCategoryRepo(), transactionRepo: getTransactionRepo() }): Promise<ImportReport> {
	return withDeferredSync(async () => {
	const owner = getActiveUser();
	const assertOwner = () => { if (getActiveUser() !== owner) throw new Error('Account changed during import'); };
	const report: ImportReport = { successCount: 0, skipCount: 0, errorCount: 0, details: [] };
	const { categoryRepo, transactionRepo } = repositories;
	const existingCats = await categoryRepo.getAll();
	const catMap = new Map(existingCats.map((c) => [c.name.toLowerCase() + '|' + c.type, c]));

	async function resolveCategory(name: string, type: TransactionType): Promise<string> {
		const key = name.toLowerCase() + '|' + type;
		const existing = catMap.get(key);
		if (existing) return existing.id;

		const newCat = await categoryRepo.create({
			name: name.trim(),
			type,
			color: '#6B7280',
			icon: 'more-horizontal'
		});
		catMap.set(key, newCat);
		return newCat.id;
	}

	for (const row of rows) {
		assertOwner();
		try {
			const categoryId = await resolveCategory(row.categoryName, row.type);
			await transactionRepo.create({
				type: row.type,
				amount: row.amount,
				categoryId,
				date: row.date,
				note: row.note || undefined
			});
			report.successCount++;
		} catch (err) {
			assertOwner();
			report.errorCount++;
			report.details.push({ entity: 'transactions', reason: err instanceof Error ? err.message : 'Unknown error' });
		}
	}

	return report;
	});
}
