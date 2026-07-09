<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { exportCSV } from '$lib/data/export-csv';
	import { parseCSVFile, executeCSVImport } from '$lib/data/import-csv';
	import { loadTransactionsFromCache } from '$lib/state/app.svelte';
	import { getCategoryRepo } from '$lib/data/repository-factory';
	import { app, showToast } from '$lib/state/app.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ImportPreviewModal from '$lib/components/settings/ImportPreviewModal.svelte';
	import ImportReportModal from '$lib/components/settings/ImportReportModal.svelte';
	import type { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '$lib/domain/entities/category';

	let darkMode = $state(false);
	let message = $state('');

	let catModalOpen = $state(false);
	let catEditId = $state<string | null>(null);
	let catFormName = $state('');
	let catFormType = $state<CategoryType>('expense');
	let catFormColor = $state('#6B7280');
	let catFormIcon = $state('more-horizontal');
	let catDeleteConfirm = $state<string | null>(null);

	let isEditingCat = $derived(catEditId !== null);

	const COLOR_PRESETS = ['#FF6B6B', '#F59E0B', '#F97316', '#4ECDC4', '#06B6D4', '#F43F5E', '#FFE66D', '#8B5CF6', '#A78BFA', '#EC4899', '#22C55E', '#3B82F6', '#10B981', '#6366F1', '#14B8A6', '#6B7280'];

	let expenseCats = $derived(app.categories.filter((c) => c.type === 'expense'));
	let incomeCats = $derived(app.categories.filter((c) => c.type === 'income'));

	function openCatAdd() {
		catEditId = null;
		catFormName = '';
		catFormType = 'expense';
		catFormColor = '#6B7280';
		catFormIcon = 'more-horizontal';
		catModalOpen = true;
	}

	function openCatEdit(c: Category) {
		catEditId = c.id;
		catFormName = c.name;
		catFormType = c.type;
		catFormColor = c.color;
		catFormIcon = c.icon;
		catModalOpen = true;
	}

	async function saveCat() {
		if (!catFormName.trim()) return;
		try {
			if (isEditingCat && catEditId) {
				const id: string = catEditId;
				const input: UpdateCategoryInput = { name: catFormName.trim(), color: catFormColor, icon: catFormIcon };
				const updated = await getCategoryRepo().update(id, input);
				app.categories = app.categories.map((c) => c.id === id ? updated : c);
				showToast('Kategori diperbarui', 'success');
			} else {
				const input: CreateCategoryInput = { name: catFormName.trim(), type: catFormType, color: catFormColor, icon: catFormIcon };
				const created = await getCategoryRepo().create(input);
				app.categories = [...app.categories, created];
				showToast('Kategori ditambahkan', 'success');
			}
			catModalOpen = false;
		} catch {
			showToast(isEditingCat ? 'Gagal memperbarui kategori' : 'Gagal menambah kategori', 'error');
		}
	}

	async function deleteCat(id: string) {
		const usageCount = app.transactions.filter((t) => t.categoryId === id).length;
		if (usageCount > 0) {
			showToast(`Kategori masih digunakan oleh ${usageCount} transaksi. Tidak dapat dihapus.`, 'warning');
			catDeleteConfirm = null;
			return;
		}
		try {
			await getCategoryRepo().delete(id);
			app.categories = app.categories.filter((c) => c.id !== id);
			showToast('Kategori dihapus', 'success');
			catDeleteConfirm = null;
		} catch {
			showToast('Gagal menghapus kategori', 'error');
		}
	}

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
			<div class="flex items-center justify-between mb-1">
				<p class="font-medium text-gray-900 dark:text-gray-100">Kategori</p>
				<button onclick={openCatAdd} class="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors">+ Tambah</button>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Atur kategori pengeluaran dan pemasukan.</p>

			<div class="space-y-3">
				<div>
					<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Pengeluaran</p>
					<div class="space-y-1">
						{#each expenseCats as c}
							<div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
								<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {c.color}"></div>
								<span class="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
								{#if c.isDefault}<span class="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">default</span>{/if}
								<button onclick={() => openCatEdit(c)} class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all" aria-label="Edit">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								</button>
								<button onclick={() => catDeleteConfirm = c.id} class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" aria-label="Hapus">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
				<div>
					<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Pemasukan</p>
					<div class="space-y-1">
						{#each incomeCats as c}
							<div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
								<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {c.color}"></div>
								<span class="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
								{#if c.isDefault}<span class="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">default</span>{/if}
								<button onclick={() => openCatEdit(c)} class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all" aria-label="Edit">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
								</button>
								<button onclick={() => catDeleteConfirm = c.id} class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" aria-label="Hapus">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							</div>
						{/each}
					</div>
				</div>
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

<Modal open={catModalOpen} title={isEditingCat ? 'Edit Kategori' : 'Tambah Kategori'} onclose={() => catModalOpen = false}>
	<div class="space-y-4">
		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama <span class="text-red-500">*</span></label>
			<input type="text" placeholder="Nama kategori" bind:value={catFormName}
				class="w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
		</div>

		{#if !isEditingCat}
			<div class="flex gap-2">
				<button type="button" onclick={() => catFormType = 'expense'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {catFormType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
				<button type="button" onclick={() => catFormType = 'income'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {catFormType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
			</div>
		{/if}

		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warna</label>
			<div class="flex flex-wrap gap-2">
				{#each COLOR_PRESETS as color}
					<button type="button" onclick={() => catFormColor = color} class="w-7 h-7 rounded-full border-2 transition-all {catFormColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}" style="background-color: {color}" aria-label={color}></button>
				{/each}
			</div>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ikon (Lucide icon name)</label>
			<input type="text" placeholder="more-horizontal" bind:value={catFormIcon}
				class="w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
		</div>

		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={() => catModalOpen = false}>Batal</Button>
			<Button variant="primary" class="flex-1" onclick={saveCat} disabled={!catFormName.trim()}>{isEditingCat ? 'Simpan' : 'Tambah'}</Button>
		</div>
	</div>
</Modal>

<Modal open={catDeleteConfirm !== null} title="Hapus Kategori?" onclose={() => catDeleteConfirm = null}>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Kategori yang dihapus tidak bisa dikembalikan. Kategori default tidak dapat dihapus.</p>
	<div class="flex gap-3">
		<Button variant="secondary" class="flex-1" onclick={() => catDeleteConfirm = null}>Batal</Button>
		<Button variant="danger" class="flex-1" onclick={() => catDeleteConfirm && deleteCat(catDeleteConfirm)}>Hapus</Button>
	</div>
</Modal>
