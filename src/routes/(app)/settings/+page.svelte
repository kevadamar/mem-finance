<script lang="ts">
	import { fade } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { exportCSV } from '$lib/data/export-csv';
	import { parseCSVFile, executeCSVImport } from '$lib/data/import-csv';
	import { loadTransactionsFromCache } from '$lib/state/app.svelte';
	import { app } from '$lib/state/app.svelte';
	import { setGmtOffset } from '$lib/utils/format';
	import ImportPreviewModal from '$lib/components/settings/ImportPreviewModal.svelte';
	import ImportReportModal from '$lib/components/settings/ImportReportModal.svelte';

	let darkMode = $state(false);
	let message = $state('');
	let resetConfirmOpen = $state(false);

	const gmtOptions = Array.from({ length: 19 }, (_, i) => {
		const val = i - 9;
		return { value: val, label: `GMT ${val >= 0 ? '+' : ''}${val}` };
	});



	let csvBusy = $state(false);
	let sqliteBusy = $state(false);
	let importPreview = $state<{ format: 'csv' | 'sqlite'; summary: any; confirm: () => Promise<void> } | null>(null);
	let importReport = $state<{ format: 'csv' | 'sqlite'; report: any } | null>(null);

	$effect(() => {
		if (typeof document !== 'undefined') {
			darkMode = document.documentElement.classList.contains('dark');
		}
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
		localStorage.setItem('memfinance_dark_mode', String(darkMode));
		document.documentElement.classList.toggle('dark', darkMode);
		document.documentElement.classList.toggle('light', !darkMode);
	}

	function exportData() {
		const data: Record<string, unknown> = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('memfinance_')) {
				try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { data[key] = localStorage.getItem(key); }
			}
		}
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'memfinance-backup.json'; a.click();
		URL.revokeObjectURL(url);
		message = 'Data berhasil diekspor!';
		setTimeout(() => message = '', 3000);
	}

	function importData() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				try {
					const data = JSON.parse(reader.result as string);
					for (const [key, value] of Object.entries(data)) {
						localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
					}
					message = 'Data berhasil diimpor! Refresh halaman untuk melihat perubahan.';
				} catch { message = 'Gagal mengimpor data. Format tidak valid.'; }
				setTimeout(() => message = '', 5000);
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function executeResetData() {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('memfinance_')) keys.push(key);
		}
		for (const key of keys) localStorage.removeItem(key);
		message = 'Semua data telah dihapus. Silakan refresh halaman.';
		setTimeout(() => message = '', 5000);
	}

	async function handleExportCSV() {
		csvBusy = true;
		try {
			const result = await exportCSV();
			if (result.count === 0) {
				message = 'Tidak ada data untuk diekspor.';
			} else {
				message = `${result.count} transaksi berhasil diekspor!`;
			}
		} catch {
			message = 'Gagal mengekspor CSV.';
		} finally {
			csvBusy = false;
			setTimeout(() => message = '', 3000);
		}
	}

	async function handleImportCSV() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			if (file.size > 10 * 1024 * 1024) {
				message = 'File terlalu besar. Maksimum 10MB.';
				setTimeout(() => message = '', 5000);
				return;
			}
			csvBusy = true;
			try {
				const result = await parseCSVFile(file);
				if (result.errors.length > 0 && result.rows.length === 0) {
					message = result.errors[0].reason;
					setTimeout(() => message = '', 5000);
					return;
				}
				importPreview = {
					format: 'csv',
					summary: result.summary,
					confirm: async () => {
						csvBusy = true;
						importPreview = null;
						try {
							const report = await executeCSVImport(result.rows);
							importReport = { format: 'csv', report };
							await loadTransactionsFromCache();
						} catch {
							message = 'Gagal mengimpor data.';
							setTimeout(() => message = '', 5000);
						} finally {
							csvBusy = false;
						}
					}
				};
			} catch {
				message = 'Gagal memproses file CSV.';
				setTimeout(() => message = '', 5000);
			} finally {
				csvBusy = false;
			}
		};
		input.click();
	}

	async function handleExportSQLite() {
		sqliteBusy = true;
		try {
			const { exportSQLite } = await import('$lib/data/export-sqlite');
			await exportSQLite();
			message = 'Database berhasil diekspor!';
		} catch {
			message = 'Gagal mengekspor SQLite. Pastikan browser mendukung WebAssembly.';
		} finally {
			sqliteBusy = false;
			setTimeout(() => message = '', 5000);
		}
	}

	async function handleImportSQLite() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.sqlite';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			if (file.size > 50 * 1024 * 1024) {
				message = 'File terlalu besar. Maksimum 50MB.';
				setTimeout(() => message = '', 5000);
				return;
			}
			sqliteBusy = true;
			try {
				const { parseSQLiteFile, executeSQLiteImport } = await import('$lib/data/import-sqlite');
				const result = await parseSQLiteFile(file);
				if (result.summary.totalRecords === 0) {
					message = 'Tidak ada data untuk diimpor.';
					setTimeout(() => message = '', 5000);
					return;
				}
				importPreview = {
					format: 'sqlite',
					summary: result.summary,
					confirm: async () => {
						sqliteBusy = true;
						importPreview = null;
						try {
							const report = await executeSQLiteImport(result);
							importReport = { format: 'sqlite', report };
							await loadTransactionsFromCache();
						} catch {
							message = 'Gagal mengimpor data.';
							setTimeout(() => message = '', 5000);
						} finally {
							sqliteBusy = false;
						}
					}
				};
			} catch {
				message = 'Gagal memproses file SQLite.';
				setTimeout(() => message = '', 5000);
			} finally {
				sqliteBusy = false;
			}
		};
		input.click();
	}
</script>

<svelte:head><title>Pengaturan — MemFinance</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-5 sm:space-y-7">
	<header><p class="text-sm font-medium text-primary-700 dark:text-primary-300">Preferensi aplikasi</p><h1 class="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">Pengaturan</h1><p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Atur tampilan dan kelola data Anda dengan aman.</p></header>

	{#if message}
		<div class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-200" role="status" transition:fade={{ duration: 180 }}>{message}</div>
	{/if}

	{#if app.user}
		<section class="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900" aria-label="Informasi akun">
			<div class="flex items-center gap-3.5">
				{#if app.user.user_metadata?.avatar_url}
					<img src={app.user.user_metadata.avatar_url} alt={app.user.user_metadata.name || 'User'} class="size-12 shrink-0 rounded-full ring-2 ring-primary-500/20 object-cover" />
				{:else}
					<div class="grid size-12 shrink-0 place-items-center rounded-full bg-primary-100 text-base font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
						{(app.user.user_metadata?.name || app.user.email || 'U').charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-bold text-gray-950 dark:text-white">{app.user.user_metadata?.name || 'Pengguna'}</p>
						<span class="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Google OAuth (Local Dummy)</span>
					</div>
					<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{app.user.email}</p>
					<p class="mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate">User ID: {app.user.id}</p>
				</div>
			</div>
		</section>
	{/if}

	<section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:divide-gray-800">
		<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
			<div>
				<p class="font-medium text-gray-900 dark:text-gray-100">Zona Waktu (GMT)</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Atur tampilan waktu sesuai zona Anda</p>
			</div>
			<select aria-label="Pilih zona waktu" value={app.gmtOffset} onchange={(e) => { const v = Number((e.target as HTMLSelectElement).value); app.gmtOffset = v; setGmtOffset(v); }}
				class="min-h-11 rounded-xl border border-gray-300 bg-white pl-3.5 pr-10 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
				{#each gmtOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center justify-between gap-4 p-4 sm:p-5">
			<div>
				<p class="font-medium text-gray-900 dark:text-gray-100">Mode Gelap</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Ubah tampilan aplikasi</p>
			</div>
			<button
				onclick={toggleDarkMode}
				class="relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 {darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}"
				role="switch"
				aria-checked={darkMode}
				aria-label="{darkMode ? 'Nonaktifkan' : 'Aktifkan'} mode gelap"
			>
				<span class="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none {darkMode ? 'translate-x-5' : 'translate-x-0'}"></span>
			</button>
		</div>

		<div class="p-4 sm:p-5">
			<p class="font-medium text-gray-900 dark:text-gray-100 mb-1">Manajemen Data</p>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Ekspor, impor, atau cadangkan data aplikasi Anda.</p>
			<div class="grid gap-2.5 sm:grid-cols-2">
				<button onclick={exportData} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
					Ekspor cadangan JSON
				</button>
				<button onclick={importData} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
					Impor cadangan JSON
				</button>
			</div>
			<div class="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
				<p class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Format data spreadsheet & database</p>
				<div class="grid gap-2 sm:grid-cols-2">
					<button onclick={handleExportCSV} disabled={csvBusy} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
						<svg class="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
						{csvBusy ? 'Memproses...' : 'Ekspor CSV'}
					</button>
					<button onclick={handleImportCSV} disabled={csvBusy} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
						<svg class="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
						{csvBusy ? 'Memproses...' : 'Impor CSV'}
					</button>
					<button onclick={handleExportSQLite} disabled={sqliteBusy} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
						<svg class="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
						{sqliteBusy ? 'Memproses...' : 'Ekspor SQLite'}
					</button>
					<button onclick={handleImportSQLite} disabled={sqliteBusy} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
						<svg class="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
						{sqliteBusy ? 'Memproses...' : 'Impor SQLite'}
					</button>
				</div>
			</div>
			<div class="mt-5 rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-950 dark:bg-red-950/20">
				<p class="font-semibold text-red-900 dark:text-red-200">Hapus semua data</p>
				<p class="mt-1 text-sm text-red-800/80 dark:text-red-300/80">Semua data lokal di perangkat ini akan dibersihkan.</p>
				<button onclick={() => resetConfirmOpen = true} class="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Hapus data perangkat</button>
			</div>
		</div>

		<div class="p-4 sm:p-5">
			<p class="font-medium text-gray-900 dark:text-gray-100 mb-1">Tentang</p>
			<div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
				<p>MemFinance v1.0.0</p>
				<p>Tech Stack: SvelteKit + Bun + Tailwind CSS + Google Sheets</p>
				<p>Chatbot: Gemini 2.0 Flash → Groq Llama 3.3 → Regex</p>
			</div>
		</div>
	</section>
</div>

<Modal open={resetConfirmOpen} title="Hapus Semua Data Perangkat?" onclose={() => resetConfirmOpen = false}>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Semua data transaksi, kategori, budget, dan pengaturan lokal di perangkat ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
	<div class="flex gap-3">
		<Button variant="secondary" class="flex-1" onclick={() => resetConfirmOpen = false}>Batal</Button>
		<Button variant="danger" class="flex-1" onclick={() => { resetConfirmOpen = false; executeResetData(); }}>Hapus Sekarang</Button>
	</div>
</Modal>

<ImportPreviewModal
	open={importPreview !== null}
	format={importPreview?.format ?? 'csv'}
	summary={importPreview?.summary ?? { entityCounts: {}, totalAmount: 0 }}
	importing={csvBusy || sqliteBusy}
	onconfirm={() => importPreview?.confirm()}
	oncancel={() => importPreview = null}
/>

<ImportReportModal
	open={importReport !== null}
	format={importReport?.format ?? 'csv'}
	report={importReport?.report ?? { successCount: 0, skipCount: 0, errorCount: 0, details: [] }}
	onclose={() => importReport = null}
/>
