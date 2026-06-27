export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function parseDate(dateStr: string): Date {
	return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
}

export function formatDate(dateStr: string): string {
	return parseDate(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
