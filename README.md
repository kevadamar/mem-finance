# MemFinance

MemFinance adalah aplikasi pencatatan keuangan personal berbasis SvelteKit, Bun, TypeScript, Tailwind CSS, IndexedDB, dan integrasi AI. Aplikasi mendukung input transaksi lewat chat, dashboard, budget, kategori, import/export data, serta fitur Receipt OCR untuk membaca struk dari gambar.

## Tech Stack

- SvelteKit 2 + Svelte 5
- Bun runtime dan test runner
- TypeScript
- Tailwind CSS
- IndexedDB untuk cache/offline-first data lokal
- Supabase untuk auth
- Google Apps Script bridge untuk sinkronisasi data
- CropperJS untuk crop/resize gambar struk sebelum OCR
- Python FastAPI OCR microservice di belakang SvelteKit server proxy

## Quick Start

Gunakan Node 22 untuk command JavaScript tooling.

```sh
nvm use 22
bun install
cp .env.example .env
bun run dev
```

Dev server default berjalan di port `5175`.

## Environment

Lihat `.env.example` untuk daftar lengkap. Variabel penting:

```env
GEMINI_API_KEY=
GROQ_API_KEY=

PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GAS_SHARED_SECRET=replace-with-random-64-char-string
GAS_WEBAPP_URL=

RECEIPT_OCR_SERVICE_URL=http://python-ocr-service:8000/api/ocr
RECEIPT_OCR_TIMEOUT_MS=35000
RECEIPT_OCR_MAX_UPLOAD_BYTES=10485760
```

`RECEIPT_OCR_SERVICE_URL` hanya dibaca di server. Frontend tidak pernah memanggil service Python secara langsung.

## Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start development server |
| `bun run check` | Run Svelte/type diagnostics |
| `bun test` | Run unit tests |
| `bun run build` | Build production output |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |

## Receipt OCR Feature

Receipt OCR tersedia dari halaman `/chat`.

User flow:

1. Klik tombol `+` di composer chat.
2. Pilih `Kamera` untuk membuka kamera device atau `Galeri` untuk memilih file gambar.
3. Setelah gambar dipilih atau foto diambil, modal crop/resize akan muncul.
4. User bisa menggeser area crop, resize frame, zoom, rotate, dan menentukan ukuran output.
5. Hasil crop dibuat menjadi JPEG baru, lalu ditampilkan sebagai attachment preview.
6. Saat pesan dikirim, frontend memanggil endpoint SvelteKit `/api/receipt-ocr`.
7. Endpoint server meneruskan file ke Python OCR microservice, lalu parser lokal mengekstrak total belanja.

### UI behavior

- Composer hanya menampilkan satu tombol attachment `+`.
- Menu attachment muncul sebagai floating vertical menu dengan pilihan `Kamera` dan `Galeri`.
- Tombol send hanya muncul di sisi kanan input ketika form dirty, yaitu ketika input lebih dari 1 karakter atau ada gambar terlampir.
- Attachment saat ini hanya mendukung satu gambar. Jika user memilih atau mengambil foto baru, gambar lama akan diganti.
- Thumbnail attachment bisa diklik untuk membuka preview besar.
- Crop/resize diberi label beta karena fitur ini masih experimental.

### Supported image input

- JPEG
- PNG
- WEBP
- Max upload default: 10MB, dikontrol oleh `RECEIPT_OCR_MAX_UPLOAD_BYTES`.

### OCR server proxy

Endpoint:

```txt
POST /api/receipt-ocr
Content-Type: multipart/form-data
field: file
```

File utama:

- `src/routes/api/receipt-ocr/+server.ts`
- `src/lib/server/env.ts`

Responsibilities:

- Validasi file wajib ada.
- Validasi format gambar.
- Validasi ukuran file.
- Proxy `FormData` ke `RECEIPT_OCR_SERVICE_URL`.
- Timeout request berdasarkan `RECEIPT_OCR_TIMEOUT_MS`.
- Validasi shape response OCR.
- Mengembalikan hasil OCR mentah dan hasil parser terstruktur.

Response sukses:

```ts
{
	success: true;
	ocr: {
		status: string;
		message: string;
		data: Array<{
			text: string;
			confidence: number;
			box: [number, number][];
		}>;
	};
	extracted: {
		totalAmount: number | null;
		totalAmountText: string | null;
		totalKeyword: string | null;
		confidence: number | null;
		rawText: string;
	};
}
```

Error codes:

- `NO_FILE`
- `UNSUPPORTED_FORMAT`
- `FILE_TOO_LARGE`
- `OCR_TIMEOUT`
- `OCR_SERVICE_ERROR`
- `INVALID_OCR_RESPONSE`

### Receipt parser

File:

- `src/lib/utils/receiptParser.ts`

Parser memakai heuristik berbasis OCR text dan bounding box:

- Mencari keyword seperti `grand total`, `total`, `subtotal`, `sub total`, `amount`, `jumlah`, dan `bayar`.
- Mengambil kandidat nominal di baris yang sama atau tepat di bawah keyword.
- Memilih nominal tertinggi sebagai kandidat utama.
- Fallback ke nominal tertinggi dari seluruh raw OCR text jika keyword tidak ditemukan.

Unit test parser:

- `tests/unit/receipt-parser.test.ts`

### Crop/resize implementation

File utama:

- `src/routes/(app)/chat/+page.svelte`

Library:

- `cropperjs`

Implementation notes:

- CropperJS di-load dengan dynamic import di browser agar aman untuk SvelteKit SSR.
- Crop result dibuat memakai `selection.$toCanvas()`.
- Output disimpan sebagai JPEG dengan kualitas `0.92`.
- Default crop aspect ratio adalah `3 / 4`, disesuaikan untuk foto struk vertikal.
- Resize output tersedia dari `900px` sampai `2200px`.
- Fitur crop/resize masih ditandai beta/experimental di UI.

## Validation Notes

Validasi yang biasa dijalankan sebelum handoff:

```sh
nvm use 22
bun run check
bun test
bun run build
```

Saat ini `bun run lint` masih dapat gagal karena konfigurasi ESLint existing belum sepenuhnya kompatibel dengan beberapa pola Svelte 5 dan environment globals seperti `window`, `self`, `module`, dan service worker APIs. Gunakan `bun run check`, test, dan build sebagai quality gate utama sampai konfigurasi ESLint dirapikan.
