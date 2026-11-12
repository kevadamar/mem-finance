<script lang="ts">
	import { fade } from 'svelte/transition';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { exportCSV } from '$lib/data/export-csv';
	import { parseCSVFile, executeCSVImport } from '$lib/data/import-csv';
	import { loadTransactionsFromCache, loadCategoriesFromCache, loadBudgetsFromCache } from '$lib/state/app.svelte';
	import { app } from '$lib/state/app.svelte';
	import { theme } from '$lib/state/theme.svelte';
	import { setGmtOffset } from '$lib/utils/format';
	import ImportPreviewModal from '$lib/components/settings/ImportPreviewModal.svelte';
	import ImportReportModal from '$lib/components/settings/ImportReportModal.svelte';
	import { getActiveUser } from '$lib/data/idb';
	import { downloadLegacyBackup, legacyClaimedBy, legacyCounts, readLegacySnapshot, recoverLegacySnapshot, type LegacySnapshot } from '$lib/data/legacy-recovery';
	let { data } = $props();
	let legacySnapshot: LegacySnapshot | null = null;
	let legacySummary = $state<ReturnType<typeof legacyCounts> | null>(null);
	let legacyBackupDownloaded = $state(false);
	let legacyConfirmed = $state(false);
	let legacyBusy = $state(false);
	let inspectedForUser: string | null = null;
	$effect(() => {
		if (inspectedForUser === data.userId) return;
		legacySnapshot = null;
		legacySummary = null;
		legacyBackupDownloaded = false;
		legacyConfirmed = false;
		inspectedForUser = data.userId;
	});
	async function inspectLegacy() {
		if (legacyClaimedBy()) {
			message = 'Arsip lokal lama sudah pernah dipulihkan pada perangkat ini.';
			return;
		}
		try {
			const snapshot = await readLegacySnapshot();
			if (!snapshot) { message = 'Tidak ada database lokal versi lama.'; return; }
			const counts = legacyCounts(snapshot);
			if (Object.values(counts).every((count) => count === 0)) { message = 'Database lokal lama tidak berisi data.'; return; }
			legacySnapshot = snapshot;
			legacySummary = counts;
		} catch { message = 'Arsip lokal lama belum dapat diperiksa.'; }
	}

	async function recoverLegacy() {
		if (!legacySnapshot || !legacyBackupDownloaded || !legacyConfirmed || legacyBusy) return;
		legacyBusy = true;
		try {
			await recoverLegacySnapshot(legacySnapshot, data.userId);
			await Promise.all([loadTransactionsFromCache(), loadCategoriesFromCache(), loadBudgetsFromCache()]);
			legacySummary = null;
			message = 'Data lokal lama telah disalin. Antrean perlu diperiksa sebelum dicoba lagi; cadangan dan database lama tetap disimpan.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Pemulihan data lokal lama gagal. Cadangan lama tetap aman.';
		} finally { legacyBusy = false; }
	}
	function assertImportAccount(owner: string) {
		if (data.userId !== owner || getActiveUser() !== owner) throw new Error('Akun berubah. Pilih file lagi untuk akun saat ini.');
	}

	let message = $state('');
	let resetConfirmOpen = $state(false);
	const preferenceKeys = ['memfinance_theme', 'memfinance_dark_mode', 'memfinance_gmt', 'memfinance_sidebar_collapsed'] as const;

	const gmtOptions = Array.from({ length: 19 }, (_, i) => {
		const val = i - 9;
		return { value: val, label: `GMT ${val >= 0 ? '+' : ''}${val}` };
	});



	let csvBusy = $state(false);
	let sqliteBusy = $state(false);
	type ImportPreview = {
		format: 'csv' | 'sqlite';
		summary: { entityCounts: Record<string, number>; dateRange?: { start: string; end: string }; totalAmount?: number };
		confirm: () => Promise<void>;
	};
	type ImportReport = {
		format: 'csv' | 'sqlite';
		report: { successCount: number; skipCount: number; errorCount: number; details: { entity?: string; id?: string; reason: string }[] };
	};
	let importPreview = $state<ImportPreview | null>(null);
	let importReport = $state<ImportReport | null>(null);

	async function refreshStorageStatus() {
		const response = await fetch('/api/storage/status');
		if (response.ok) {
			message = 'Status kepemilikan sudah diperbarui.';
			await invalidateAll();
		} else {
			message = 'Status Google Drive belum dapat diperiksa. Coba lagi nanti.';
		}
	}

	function exportPreferences() {
		const data: Record<string, unknown> = {};
		for (const key of preferenceKeys) {
			const value = localStorage.getItem(key);
			if (value !== null) data[key] = value;
		}
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'memfinance-preferensi.json'; a.click();
		URL.revokeObjectURL(url);
		message = 'Preferensi berhasil diekspor.';
		setTimeout(() => message = '', 3000);
	}

	function importPreferences() {
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
					if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid preferences');
					for (const key of preferenceKeys) {
						const value = (data as Record<string, unknown>)[key];
						if (typeof value === 'string') localStorage.setItem(key, value);
					}
					message = 'Preferensi berhasil diimpor. Refresh halaman untuk menerapkan semua perubahan.';
				} catch { message = 'Gagal mengimpor preferensi. Format tidak valid.'; }
				setTimeout(() => message = '', 5000);
			};
			reader.readAsText(file);
		};
		input.click();
	}

	function executeResetPreferences() {
		for (const key of preferenceKeys) localStorage.removeItem(key);
		message = 'Preferensi perangkat telah dihapus. Refresh halaman untuk menerapkan pengaturan awal.';
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
			const importOwner = getActiveUser();
			try {
				const result = await parseCSVFile(file);
				if (result.errors.length > 0 && result.rows.length === 0) {
					message = result.errors[0].reason;
					setTimeout(() => message = '', 5000);
					return;
				}
				importPreview = {
					format: 'csv',
					summary: {
						entityCounts: { transactions: result.summary.valid },
						dateRange: result.summary.dateRange,
						totalAmount: result.summary.totalAmount
					},
					confirm: async () => {
						csvBusy = true;
						importPreview = null;
						try {
							assertImportAccount(importOwner);
							const report = await executeCSVImport(result.rows);
							importReport = { format: 'csv', report };
							await loadTransactionsFromCache();
						} catch (error) {
							message = error instanceof Error && error.message.startsWith('Akun berubah') ? error.message : 'Gagal mengimpor data.';
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
			const importOwner = getActiveUser();
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
							assertImportAccount(importOwner);
							const report = await executeSQLiteImport(result);
							importReport = { format: 'sqlite', report };
							await loadTransactionsFromCache();
						} catch (error) {
							message = error instanceof Error && error.message.startsWith('Akun berubah') ? error.message : 'Gagal mengimpor data.';
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

<svelte:head><title>Pengaturan · MemFinance</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-5 sm:space-y-7">
	<header>
		<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-text)]">
			<span class="inline-block size-1.5 rounded-full bg-[var(--brand-fill)]"></span>
			Sistem · Konfigurasi
		</div>
		<h1 class="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Pengaturan</h1>
		<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)]">Atur preferensi tampilan dan kelola data Anda secara aman.</p>
	</header>

	{#if message}
		<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-primary-50 px-4 py-3 font-mono text-xs font-bold text-primary-900 shadow-[var(--shadow-retro-sm)] dark:bg-primary-950/60 dark:text-primary-200" role="status" transition:fade={{ duration: 180 }}>{message}</div>
	{/if}

	{#if app.user}
		<section class="retro-card overflow-hidden bg-[var(--surface-1)] p-4 sm:p-5" aria-label="Informasi akun">
			<div class="flex items-center gap-3.5">
				{#if app.user.user_metadata?.avatar_url}
					<img src={app.user.user_metadata.avatar_url} alt={app.user.user_metadata.name || 'User'} class="size-12 shrink-0 rounded-lg border-[1.5px] border-[var(--border-strong)] object-cover shadow-[var(--shadow-retro-sm)]" />
				{:else}
					<div class="grid size-12 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] text-base font-black text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]">
						{(app.user.user_metadata?.name || app.user.email || 'U').charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-bold text-[var(--text-primary)]">{app.user.user_metadata?.name || 'Pengguna'}</p>
						<span class="rounded-md border border-[var(--border-strong)] bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{app.user.app_metadata?.provider === 'google' ? 'Google' : 'Email'}</span>
					</div>
					<p class="mt-0.5 font-mono text-xs text-[var(--text-secondary)] truncate">{app.user.email}</p>
					<p class="mt-1 font-mono text-[10px] text-[var(--text-tertiary)] truncate">USER ID: {app.user.id}</p>
				</div>
			</div>
		</section>
	{/if}

	{#if data.personalStorageEnabled}
		<section class="retro-card bg-[var(--surface-1)] p-4 sm:p-5" aria-label="Kepemilikan spreadsheet">
			<h2 class="font-bold text-[var(--text-primary)]">Kepemilikan Spreadsheet</h2>
			<p class="mt-1 text-sm text-[var(--text-secondary)]">
				{data.storageStatus === 'USER_OWNED_ADMIN_EDITOR' ? 'Spreadsheet ini milik akun Google Anda.' : 'Spreadsheet ini belum terverifikasi sebagai milik akun Google Anda.'}
			</p>
			{#if data.storageStatus === 'USER_OWNED_ADMIN_EDITOR'}
				<p class="mt-1 text-xs text-[var(--text-tertiary)]">Admin aplikasi tetap memiliki akses editor agar sinkronisasi melalui Apps Script berjalan.</p>
			{/if}
			{#if data.storageStatus === 'USER_OWNED_ADMIN_EDITOR' || data.storageStatus === 'TRANSFER_PENDING'}
				<button type="button" class="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)] underline" onclick={() => void refreshStorageStatus()}>Periksa status Google Drive →</button>
			{/if}
		</section>
	{/if}

	{#if !legacySummary}
		<section class="retro-card bg-[var(--surface-1)] p-4 sm:p-5" aria-label="Periksa data lokal lama">
			<h2 class="font-bold text-[var(--text-primary)]">Data lokal versi lama</h2>
			<p class="mt-1 text-sm text-[var(--text-secondary)]">Jika Anda memakai MemFinance sebelum data perangkat dipisahkan per akun, periksa apakah ada arsip lokal yang perlu dipulihkan.</p>
			<button type="button" class="retro-btn-push mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]" onclick={() => void inspectLegacy()}>Periksa arsip lokal</button>
		</section>
	{:else}
		<section class="rounded-2xl border-[1.5px] border-amber-600 bg-amber-50 p-4 sm:p-5 dark:border-amber-700 dark:bg-amber-950/40 shadow-[var(--shadow-retro-sm)]" aria-label="Pemulihan data lokal lama">
			<h2 class="font-bold text-amber-950 dark:text-amber-100">Data lokal dari versi lama ditemukan</h2>
			<p class="mt-1 text-sm text-amber-900 dark:text-amber-200">{legacySummary.transactions} transaksi, {legacySummary.categories} kategori, {legacySummary.budgets} anggaran, dan {legacySummary.pending} operasi antrean. Data lama tidak otomatis dikaitkan ke akun mana pun.</p>
			<p class="mt-2 text-sm text-amber-900 dark:text-amber-200">Unduh cadangan sebelum memulihkan. Jika perangkat pernah dipakai beberapa akun, jangan lanjut tanpa memeriksa pemilik data. Antrean dipulihkan sebagai “perlu tindakan” dan tidak langsung dikirim; bandingkan dengan data server sebelum mencoba sinkronisasi agar tidak terduplikasi.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button type="button" class="retro-btn-push inline-flex min-h-11 items-center rounded-lg border-[1.5px] border-amber-700 bg-amber-100 px-4 font-mono text-xs font-bold uppercase tracking-wider text-amber-950 dark:bg-amber-900 dark:text-amber-100 shadow-[var(--shadow-retro-sm)]" onclick={() => { if (legacySnapshot) { downloadLegacyBackup(legacySnapshot); legacyBackupDownloaded = true; } }}>Unduh arsip lokal lama</button>
			</div>
			<label class="mt-3 flex items-start gap-2 text-sm text-amber-950 dark:text-amber-100">
				<input type="checkbox" class="mt-1" bind:checked={legacyConfirmed} disabled={!legacyBackupDownloaded} />
				<span>Saya sudah mengunduh cadangan dan memastikan data ini milik akun {data.user?.email ?? data.userId}.</span>
			</label>
			<button type="button" class="retro-btn-push mt-3 inline-flex min-h-11 items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-amber-800 px-4 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[var(--shadow-retro-sm)] disabled:cursor-not-allowed disabled:opacity-50" disabled={!legacyConfirmed || legacyBusy} onclick={() => void recoverLegacy()}>{legacyBusy ? 'Memulihkan…' : 'Salin data ke akun ini'}</button>
		</section>
	{/if}

	<section class="retro-card overflow-hidden bg-[var(--surface-1)] divide-y-[1.5px] divide-[var(--border-strong)]" aria-label="Preferensi aplikasi">
		<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
			<div>
				<p class="font-bold text-[var(--text-primary)]">Zona Waktu (GMT)</p>
				<p class="text-xs text-[var(--text-secondary)]">Atur tampilan waktu sesuai zona Anda</p>
			</div>
			<select aria-label="Pilih zona waktu" value={app.gmtOffset} onchange={(e) => { const v = Number((e.target as HTMLSelectElement).value); app.gmtOffset = v; setGmtOffset(v); }}
				class="min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] pl-3.5 pr-10 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none">
					{#each gmtOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
			<div>
				<p class="font-bold text-[var(--text-primary)]">Mode Tampilan</p>
				<p class="text-xs text-[var(--text-secondary)]">Kertas Gading Hangat / Fosfor Vintage / Ikuti Sistem</p>
			</div>
			<div class="inline-flex rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-1 shadow-[var(--shadow-retro-sm)]" role="group" aria-label="Preferensi tema tampilan">
				<button
					type="button"
					onclick={() => theme.setPreference('system')}
					class="min-h-9 rounded-md px-3 font-mono text-xs font-bold uppercase tracking-wider transition-all {theme.preference === 'system' ? 'border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[1px_1px_0_var(--shadow-retro)]' : 'border-[1.5px] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
				>
					Sistem
				</button>
				<button
					type="button"
					onclick={() => theme.setPreference('light')}
					class="min-h-9 rounded-md px-3 font-mono text-xs font-bold uppercase tracking-wider transition-all {theme.preference === 'light' ? 'border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[1px_1px_0_var(--shadow-retro)]' : 'border-[1.5px] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
				>
					Terang
				</button>
				<button
					type="button"
					onclick={() => theme.setPreference('dark')}
					class="min-h-9 rounded-md px-3 font-mono text-xs font-bold uppercase tracking-wider transition-all {theme.preference === 'dark' ? 'border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[1px_1px_0_var(--shadow-retro)]' : 'border-[1.5px] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
				>
					Gelap
				</button>
			</div>
		</div>

		<div class="p-4 sm:p-5">
			<p class="font-bold text-[var(--text-primary)] mb-0.5">Manajemen Data</p>
			<p class="text-xs text-[var(--text-secondary)] mb-4">Ekspor atau impor preferensi perangkat. Untuk data keuangan, gunakan ekspor CSV atau SQLite di bawah.</p>
			<div class="grid gap-2.5 sm:grid-cols-2">
				<button onclick={exportPreferences} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]">
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
					Ekspor JSON
				</button>
				<button onclick={importPreferences} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]">
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
					Impor JSON
				</button>
			</div>
			<div class="mt-5 border-t-[1.5px] border-[var(--border-strong)] pt-4">
				<p class="mb-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--brand-text)]">Format Tabel & Database</p>
				<div class="grid gap-2 sm:grid-cols-2">
					<button onclick={handleExportCSV} disabled={csvBusy} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50">
						<svg class="size-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
						{csvBusy ? 'Memproses...' : 'Ekspor CSV'}
					</button>
					<button onclick={handleImportCSV} disabled={csvBusy} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50">
						<svg class="size-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
						{csvBusy ? 'Memproses...' : 'Impor CSV'}
					</button>
					<button onclick={handleExportSQLite} disabled={sqliteBusy} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50">
						<svg class="size-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
						{sqliteBusy ? 'Memproses...' : 'Ekspor SQLite'}
					</button>
					<button onclick={handleImportSQLite} disabled={sqliteBusy} class="retro-btn-push inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50">
						<svg class="size-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
						{sqliteBusy ? 'Memproses...' : 'Impor SQLite'}
					</button>
				</div>
			</div>
			<div class="mt-5 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-danger-50/60 p-4 shadow-[var(--shadow-retro-sm)] dark:bg-danger-950/20">
				<p class="font-bold text-danger-800 dark:text-danger-300">Atur ulang preferensi perangkat</p>
				<p class="mt-0.5 text-xs text-danger-700/80 dark:text-danger-400/80">Tema, zona waktu, dan tampilan sidebar akan kembali ke pengaturan awal. Data keuangan tidak dihapus.</p>
				<button onclick={() => resetConfirmOpen = true} class="retro-btn-push mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-600 px-4 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[var(--shadow-retro-sm)] hover:bg-danger-700">Atur ulang preferensi</button>
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

<Modal open={resetConfirmOpen} title="Atur Ulang Preferensi Perangkat?" onclose={() => resetConfirmOpen = false}>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Tema, zona waktu, dan tampilan sidebar pada perangkat ini akan kembali ke pengaturan awal. Transaksi, kategori, budget, dan data yang menunggu sinkronisasi tidak dihapus.</p>
	<div class="flex gap-3">
		<Button variant="secondary" class="flex-1" onclick={() => resetConfirmOpen = false}>Batal</Button>
		<Button variant="danger" class="flex-1" onclick={() => { resetConfirmOpen = false; executeResetPreferences(); }}>Atur Ulang</Button>
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
