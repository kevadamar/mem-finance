export function formatRupiah(amount: number): string {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function parseDate(dateStr: string): Date {
	return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
}

export function toDateTimeLocalValue(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return '';
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	return isNaN(date.getTime()) ? undefined : date.toISOString();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

function toAdjustedUtc(dateStr: string): Date {
	const d = parseDate(dateStr);
	return new Date(d.getTime() + _gmtOffset * 3600000);
}

export function formatDate(dateStr: string): string {
	const d = toAdjustedUtc(dateStr);
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(dateStr: string): string {
	const d = toAdjustedUtc(dateStr);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function formatDateOnly(dateStr: string): string {
	const d = toAdjustedUtc(dateStr);
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
