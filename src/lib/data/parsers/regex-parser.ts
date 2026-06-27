import type { ParsedTransaction } from '../../domain/entities/chat';
import type { TransactionType } from '../../domain/entities/transaction';

const CATEGORY_KEYWORDS: Record<string, { category: string; type: TransactionType }> = {
	// Makanan
	makan: { category: 'Makanan', type: 'expense' },
	makanan: { category: 'Makanan', type: 'expense' },
	sarapan: { category: 'Makanan', type: 'expense' },
	'makan siang': { category: 'Makanan', type: 'expense' },
	'makan malam': { category: 'Makanan', type: 'expense' },
	nasi: { category: 'Makanan', type: 'expense' },
	ayam: { category: 'Makanan', type: 'expense' },
	soto: { category: 'Makanan', type: 'expense' },
	warteg: { category: 'Makanan', type: 'expense' },
	mi: { category: 'Makanan', type: 'expense' },
	bakso: { category: 'Makanan', type: 'expense' },

	// Minuman
	minum: { category: 'Minuman', type: 'expense' },
	kopi: { category: 'Minuman', type: 'expense' },
	teh: { category: 'Minuman', type: 'expense' },
	jus: { category: 'Minuman', type: 'expense' },
	boba: { category: 'Minuman', type: 'expense' },
	es: { category: 'Minuman', type: 'expense' },

	// Jajan & Cemilan
	jajan: { category: 'Jajan & Cemilan', type: 'expense' },
	cemilan: { category: 'Jajan & Cemilan', type: 'expense' },
	'snack': { category: 'Jajan & Cemilan', type: 'expense' },
	keripik: { category: 'Jajan & Cemilan', type: 'expense' },
	roti: { category: 'Jajan & Cemilan', type: 'expense' },
	eskrim: { category: 'Jajan & Cemilan', type: 'expense' },

	// Transportasi umum
	transport: { category: 'Transportasi', type: 'expense' },
	transportasi: { category: 'Transportasi', type: 'expense' },
	bus: { category: 'Transportasi', type: 'expense' },
	kereta: { category: 'Transportasi', type: 'expense' },
	ktm: { category: 'Transportasi', type: 'expense' },
	mrt: { category: 'Transportasi', type: 'expense' },
	tiket: { category: 'Transportasi', type: 'expense' },

	// Bensin & Parkir
	bensin: { category: 'Bensin & Parkir', type: 'expense' },
	parkir: { category: 'Bensin & Parkir', type: 'expense' },
	bbm: { category: 'Bensin & Parkir', type: 'expense' },
	premium: { category: 'Bensin & Parkir', type: 'expense' },
	pertalite: { category: 'Bensin & Parkir', type: 'expense' },
	pertamax: { category: 'Bensin & Parkir', type: 'expense' },
	tol: { category: 'Bensin & Parkir', type: 'expense' },

	// Ojek & Taksi
	gojek: { category: 'Ojek & Taksi', type: 'expense' },
	grab: { category: 'Ojek & Taksi', type: 'expense' },
	ojek: { category: 'Ojek & Taksi', type: 'expense' },
	taksi: { category: 'Ojek & Taksi', type: 'expense' },
	'go car': { category: 'Ojek & Taksi', type: 'expense' },
	'go ride': { category: 'Ojek & Taksi', type: 'expense' },

	// Belanja
	belanja: { category: 'Belanja', type: 'expense' },
	beli: { category: 'Belanja', type: 'expense' },
	pakaian: { category: 'Belanja', type: 'expense' },
	baju: { category: 'Belanja', type: 'expense' },
	sepatu: { category: 'Belanja', type: 'expense' },
	aksesoris: { category: 'Belanja', type: 'expense' },

	// Pulsa & Kuota
	pulsa: { category: 'Pulsa & Kuota', type: 'expense' },
	kuota: { category: 'Pulsa & Kuota', type: 'expense' },
	internet: { category: 'Pulsa & Kuota', type: 'expense' },
	'paket data': { category: 'Pulsa & Kuota', type: 'expense' },

	// Hiburan
	bioskop: { category: 'Hiburan', type: 'expense' },
	nobar: { category: 'Hiburan', type: 'expense' },
	konser: { category: 'Hiburan', type: 'expense' },
	nongkrong: { category: 'Hiburan', type: 'expense' },
	game: { category: 'Hiburan', type: 'expense' },
	main: { category: 'Hiburan', type: 'expense' },
	wisata: { category: 'Hiburan', type: 'expense' },
	liburan: { category: 'Hiburan', type: 'expense' },

	// Streaming
	netflix: { category: 'Streaming', type: 'expense' },
	spotify: { category: 'Streaming', type: 'expense' },
	youtube: { category: 'Streaming', type: 'expense' },
	disney: { category: 'Streaming', type: 'expense' },
	vip: { category: 'Streaming', type: 'expense' },
	langganan: { category: 'Streaming', type: 'expense' },
	subscribe: { category: 'Streaming', type: 'expense' },

	// Tagihan umum
	listrik: { category: 'Listrik & Air', type: 'expense' },
	air: { category: 'Listrik & Air', type: 'expense' },
	pdam: { category: 'Listrik & Air', type: 'expense' },
	pln: { category: 'Listrik & Air', type: 'expense' },

	// Kesehatan
	dokter: { category: 'Kesehatan', type: 'expense' },
	obat: { category: 'Kesehatan', type: 'expense' },
	sehat: { category: 'Kesehatan', type: 'expense' },
	'rumah sakit': { category: 'Kesehatan', type: 'expense' },
	rs: { category: 'Kesehatan', type: 'expense' },
	klinik: { category: 'Kesehatan', type: 'expense' },
	vitamin: { category: 'Kesehatan', type: 'expense' },
	apotek: { category: 'Kesehatan', type: 'expense' },
	olahraga: { category: 'Kesehatan', type: 'expense' },
	gym: { category: 'Kesehatan', type: 'expense' },

	// Pendidikan
	sekolah: { category: 'Pendidikan', type: 'expense' },
	kuliah: { category: 'Pendidikan', type: 'expense' },
	buku: { category: 'Pendidikan', type: 'expense' },
	les: { category: 'Pendidikan', type: 'expense' },
	'kursus': { category: 'Pendidikan', type: 'expense' },
	spi: { category: 'Pendidikan', type: 'expense' },
	ukt: { category: 'Pendidikan', type: 'expense' },

	// Rokok
	rokok: { category: 'Rokok', type: 'expense' },
	vape: { category: 'Rokok', type: 'expense' },
	kretek: { category: 'Rokok', type: 'expense' },
	sampoerna: { category: 'Rokok', type: 'expense' },
	marlboro: { category: 'Rokok', type: 'expense' },

	// Kos/Kontrakan
	kos: { category: 'Kos/Kontrakan', type: 'expense' },
	kontrakan: { category: 'Kos/Kontrakan', type: 'expense' },
	kontrak: { category: 'Kos/Kontrakan', type: 'expense' },
	sewa: { category: 'Kos/Kontrakan', type: 'expense' },
	indekos: { category: 'Kos/Kontrakan', type: 'expense' },

	// E-commerce
	shopee: { category: 'E-commerce', type: 'expense' },
	tokopedia: { category: 'E-commerce', type: 'expense' },
	lazada: { category: 'E-commerce', type: 'expense' },
	blibli: { category: 'E-commerce', type: 'expense' },
	online: { category: 'E-commerce', type: 'expense' },
	checkout: { category: 'E-commerce', type: 'expense' },

	// Donasi
	donasi: { category: 'Donasi', type: 'expense' },
	sedekah: { category: 'Donasi', type: 'expense' },
	zakat: { category: 'Donasi', type: 'expense' },
	infaq: { category: 'Donasi', type: 'expense' },
	amal: { category: 'Donasi', type: 'expense' },

	// Income
	gaji: { category: 'Gaji', type: 'income' },
	freelance: { category: 'Freelance', type: 'income' },
	proyek: { category: 'Freelance', type: 'income' },
	investasi: { category: 'Investasi', type: 'income' },
	saham: { category: 'Investasi', type: 'income' },
	dividen: { category: 'Investasi', type: 'income' },
	kripto: { category: 'Investasi', type: 'income' },
	hadiah: { category: 'Hadiah', type: 'income' },
	refund: { category: 'Refund', type: 'income' },
	dapat: { category: 'Lainnya', type: 'income' },
	terima: { category: 'Lainnya', type: 'income' },
	'transfer masuk': { category: 'Lainnya', type: 'income' }
};

function extractAmount(text: string): { amount: number; remaining: string } | null {
	const clean = text.toLowerCase().replace(/rp\.?\s*/g, '');

	const patterns = [
		/(\d+[\d.,]*)\s*(?:ribu|rb)\b/,
		/(\d+[\d.,]*)\s*(?:juta|jt)\b/,
		/(\d+[\d.,]*)\s*(?:k)\b/i,
		/(\d+[\d.,]*)\s*(?:ribu|rb|juta|jt|k)\b/i
	];

	for (const pattern of patterns) {
		const match = clean.match(pattern);
		if (match) {
			let num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
			if (clean.includes('juta') || clean.includes('jt')) num *= 1000000;
			else if (clean.includes('ribu') || clean.includes('rb')) num *= 1000;
			else if (clean.toLowerCase().includes('k')) num *= 1000;
			return { amount: Math.round(num), remaining: clean.replace(match[0], '').trim() };
		}
	}

	const plainMatch = clean.match(/(\d[\d.,]*\d)\s*(?:perak|rupiah)?/);
	if (plainMatch) {
		const num = parseFloat(plainMatch[1].replace(/\./g, '').replace(',', '.'));
		if (num >= 100 && num <= 999999999) {
			return { amount: Math.round(num), remaining: clean.replace(plainMatch[0], '').trim() };
		}
	}

	return null;
}

function detectCategory(text: string): { category: string; type: TransactionType } {
	const lower = text.toLowerCase();
	for (const [keyword, info] of Object.entries(CATEGORY_KEYWORDS)) {
		if (lower.includes(keyword)) return info;
	}
	return { category: 'Lainnya', type: 'expense' };
}

function extractNote(text: string, amount: string, category: string): string {
	let note = text.replace(new RegExp(amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
		.replace(new RegExp(category, 'i'), '')
		.replace(/\s+/g, ' ')
		.trim();
	return note || undefined as unknown as string;
}

export function parseWithRegex(message: string): { success: boolean; data: ParsedTransaction | null; fallbackLevel: 'regex'; message: string } {
	const trimmed = message.trim();
	if (!trimmed) {
		return { success: true, data: null, fallbackLevel: 'regex', message: 'Pesan tidak boleh kosong.' };
	}

	const amountResult = extractAmount(trimmed);
	if (!amountResult) {
		return {
			success: true,
			data: null,
			fallbackLevel: 'regex',
			message: 'Maaf, saya tidak bisa menemukan nominal transaksi. Bisa sebutkan jumlahnya? Contoh: \'Beli kopi 35rb\''
		};
	}

	const { category, type } = detectCategory(amountResult.remaining || trimmed);
	const note = extractNote(amountResult.remaining, String(amountResult.amount), category);
	const today = new Date().toISOString().split('T')[0];

	return {
		success: true,
		fallbackLevel: 'regex',
		data: {
			type,
			amount: amountResult.amount,
			category,
			date: today,
			note: note || undefined,
			confidence: 0.7
		},
		message: ''
	};
}
