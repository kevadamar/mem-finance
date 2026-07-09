<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { exportCSV } from '$lib/data/export-csv';
	import { parseCSVFile, executeCSVImport } from '$lib/data/import-csv';
	import { loadTransactionsFromCache } from '$lib/state/app.svelte';
	import { app } from '$lib/state/app.svelte';
	import { setGmtOffset } from '$lib/utils/format';
	import ImportPreviewModal from '$lib/components/settings/ImportPreviewModal.svelte';
	import ImportReportModal from '$lib/components/settings/ImportReportModal.svelte';

	let darkMode = $state(false);
	let message = $state('');

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

	function resetData() {
		if (!confirm('Yakin ingin menghapus semua data? Tindakan ini tidak bisa dibatalkan.')) return;
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith('memfinance_')) keys.push(key);
		}
		for (const key of keys) localStorage.removeItem(key);
		message = 'Semua data telah dihapus. Refresh halaman.';
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

<div class="space-y-6 max-w-2xl">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Pengaturan</h1>

	{#if message}
		<div class="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm" transition:fade={{ duration: 200 }}>{message}</div>
	{/if}

	<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
		<div class="p-5 flex items-center justify-between">
			<div>
				<p class="font-medium text-gray-900 dark:text-gray-100">Zona Waktu (GMT)</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Atur tampilan waktu sesuai zona Anda</p>
			</div>
			<select value={app.gmtOffset} onchange={(e) => { const v = Number((e.target as HTMLSelectElement).value); app.gmtOffset = v; setGmtOffset(v); }}
				class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
				{#each gmtOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<div class="p-5 flex items-center justify-between">
			<div>
				<p class="font-medium text-gray-900 dark:text-gray-100">Mode Gelap</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Ubah tampilan aplikasi</p>
			</div>
			<button
				onclick={toggleDarkMode}
				class="relative w-11 h-6 rounded-full transition-colors {darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}"
				role="switch"
				aria-checked={darkMode}
			>
				<span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform {darkMode ? 'translate-x-5' : 'translate-x-0'}"></span>
			</button>
		</div>

		<div class="p-5">
			<p class="font-medium text-gray-900 dark:text-gray-100 mb-1">Manajemen Data</p>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Ekspor, impor, atau hapus data aplikasi.</p>
			<div class="flex flex-wrap gap-3">
				<button onclick={exportData} class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">📥 Ekspor Data</button>
				<button onclick={importData} class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">📤 Impor Data</button>
			</div>
			<div class="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
				<button onclick={handleExportCSV} disabled={csvBusy} class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">{csvBusy ? '⏳' : '📥'} Ekspor CSV</button>
				<button onclick={handleImportCSV} disabled={csvBusy} class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">{csvBusy ? '⏳' : '📤'} Impor CSV</button>
				<button onclick={handleExportSQLite} disabled={sqliteBusy} class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">{sqliteBusy ? '⏳' : '📦'} Ekspor SQLite</button>
				<button onclick={handleImportSQLite} disabled={sqliteBusy} class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">{sqliteBusy ? '⏳' : '📦'} Impor SQLite</button>
				<button onclick={resetData} class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">🗑 Hapus Semua</button>
			</div>
		</div>

		<div class="p-5">
			<p class="font-medium text-gray-900 dark:text-gray-100 mb-1">Tentang</p>
			<div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
				<p>MemFinance v1.0.0</p>
				<p>Tech Stack: SvelteKit + Bun + Tailwind CSS + Google Sheets</p>
				<p>Chatbot: Gemini 2.0 Flash → Groq Llama 3.3 → Regex</p>
			</div>
		</div>
	</div>
</div>

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
