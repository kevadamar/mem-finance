export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function parseDate(dateStr: string): Date {
	return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
}

export function formatDate(dateStr: string): string {
	return parseDate(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

let _gmtOffset = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('memfinance_gmt') ?? '7') : 7;

export function setGmtOffset(offset: number) {
	_gmtOffset = offset;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('memfinance_gmt', String(offset));
	}
}

export function getGmtOffset(): number {
	return _gmtOffset;
}

function applyGmt(date: Date): Date {
	const d = new Date(date);
	d.setHours(d.getHours() + _gmtOffset);
	return d;
}

export function formatDateTime(dateStr: string): string {
	const d = parseDate(dateStr);
	const adjusted = applyGmt(d);
	const time = adjusted.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
	const date = adjusted.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	return `${date} ${time}`;
}

export function formatDateOnly(dateStr: string): string {
	const d = parseDate(dateStr);
	const adjusted = applyGmt(d);
	return adjusted.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
