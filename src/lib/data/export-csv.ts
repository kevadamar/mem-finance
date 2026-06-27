import * as idb from './idb';
import { STORES } from './idb';
import type { Transaction } from '$lib/domain/entities/transaction';
import type { Category } from '$lib/domain/entities/category';

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

export async function exportCSV(): Promise<{ count: number }> {
	const [transactions, categories] = await Promise.all([
		idb.getAll<Transaction>(STORES.TRANSACTIONS),
		idb.getAll<Category>(STORES.CATEGORIES)
	]);

	const active = transactions.filter((t) => t.flagActive !== false);
	if (active.length === 0) return { count: 0 };

	const catMap = new Map(categories.map((c) => [c.id, c.name]));

	const header = 'ID,Tipe,Jumlah,Kategori,Tanggal,Catatan,Dibuat,Diperbarui';
	const rows = active.map((t) => {
		const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
		const catName = catMap.get(t.categoryId) ?? 'Lainnya';
		const note = escapeCSV(t.note ?? '');
		const date = toDateStr(t.date);
		return `${t.id},${typeLabel},${t.amount},${escapeCSV(catName)},${date},${note},${t.createdAt},${t.updatedAt}`;
	});

	const bom = '\uFEFF';
	const csv = bom + header + '\n' + rows.join('\n');
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `memfinance-transaksi-${new Date().toISOString().split('T')[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);

	return { count: active.length };
}
