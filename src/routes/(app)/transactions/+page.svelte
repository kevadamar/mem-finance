<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide, fly } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import StaleIndicator from '$lib/components/ui/StaleIndicator.svelte';
	import { getTransactionRepo, getCategoryRepo } from '$lib/data/repository-factory';
	import { CreateTransactionUseCase, TransactionValidationError } from '$lib/domain/usecases/create-transaction.usecase';
	import { validateTransaction } from '$lib/domain/validators/transaction.validator';
	import { app, loadTransactionsFromCache, loadCategoriesFromCache, showToast, withMutation } from '$lib/state/app.svelte';
	import { formatRupiah, formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '$lib/utils/format';
	import type { Transaction, TransactionType, CreateTransactionInput, UpdateTransactionInput } from '$lib/domain/entities/transaction';
	import type { Category } from '$lib/domain/entities/category';

	let filterType = $state<'' | TransactionType>('');
	let filterCategory = $state('');
	let filterStart = $state('');
	let filterEnd = $state('');
	let filterSearch = $state('');
	let sortBy = $state<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

	let showFilters = $state(false);
	let filterCount = $derived([filterType, filterCategory, filterStart, filterEnd].filter(Boolean).length);

	let modalOpen = $state(false);
	let editMode = $state(false);
	let editId = $state<string | null>(null);
	let formType = $state<TransactionType>('expense');
	let formAmount = $state('');
	let formCategory = $state('');
	let formDate = $state('');
	let formCreatedAt = $state('');
	let formNote = $state('');
	let formErrors = $state<Record<string, string>>({});
	let formLoading = $state(false);
	let deleteConfirm = $state<string | null>(null);

	let filteredTransactions = $derived.by(() => {
		let result = [...app.transactions];

		if (filterType) result = result.filter((t) => t.type === filterType);
		if (filterCategory) result = result.filter((t) => t.categoryId === filterCategory);
		if (filterStart) result = result.filter((t) => t.date >= filterStart);
		if (filterEnd) result = result.filter((t) => t.date <= filterEnd);
		if (filterSearch) {
			const q = filterSearch.toLowerCase();
			result = result.filter((t) => (t.note || '').toLowerCase().includes(q) || (app.categories.find((c) => c.id === t.categoryId)?.name || '').toLowerCase().includes(q));
		}

		switch (sortBy) {
			case 'date-asc': result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
			case 'amount-desc': result.sort((a, b) => b.amount - a.amount); break;
			case 'amount-asc': result.sort((a, b) => a.amount - b.amount); break;
			default: result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		}
		return result;
	});

	let filteredCatOptions = $derived(app.categories.filter((c) => c.type === formType));

	function clearFilters() {
		filterType = '';
		filterCategory = '';
		filterStart = '';
		filterEnd = '';
		filterSearch = '';
	}

	async function load() {
		await Promise.all([loadTransactionsFromCache(), loadCategoriesFromCache()]);
		try {
			const [txs, cats] = await Promise.all([getTransactionRepo().getAll(), getCategoryRepo().getAll()]);
			app.transactions = txs;
			app.categories = cats;
			app.transactionsStale = false;
		} catch {
			if (app.transactions.length > 0) app.transactionsStale = true;
		}
	}

	function openCreate() {
		editMode = false;
		editId = null;
		formType = 'expense';
		formAmount = '';
		formCategory = '';
		formDate = new Date().toISOString().split('T')[0];
		formCreatedAt = toDateTimeLocalValue(new Date().toISOString());
		formNote = '';
		formErrors = {};
		modalOpen = true;
	}

	function openEdit(t: Transaction) {
		editMode = true;
		editId = t.id;
		formType = t.type;
		formAmount = String(t.amount);
		formCategory = t.categoryId;
		formDate = (t.date ?? '').split('T')[0];
		formCreatedAt = toDateTimeLocalValue(t.createdAt);
		formNote = t.note || '';
		formErrors = {};
		modalOpen = true;
	}

	function formatAmountInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '');
		formAmount = raw;
	}

	async function handleSubmit() {
		formErrors = {};
		formLoading = true;

		const parsedAmount = parseInt(formAmount, 10);
		const input: CreateTransactionInput & UpdateTransactionInput = {
			type: formType,
			amount: isNaN(parsedAmount) ? 0 : parsedAmount,
			categoryId: formCategory,
			date: formDate,
			note: formNote || undefined,
			createdAt: fromDateTimeLocalValue(formCreatedAt)
		};

		const validation = validateTransaction(input);
		if (!validation.valid) {
			for (const e of validation.errors) formErrors[e.field] = e.message;
			formLoading = false;
			return;
		}

		try {
			const repo = getTransactionRepo();
			if (editMode && editId) {
				const id = editId;
				const result = await withMutation(() => repo.update(id, input));
				const idx = app.transactions.findIndex((t) => t.id === id);
				if (idx >= 0) app.transactions[idx] = result;
				showToast('Transaksi diperbarui', 'success');
			} else {
				const result = await withMutation(() => repo.create(input));
				app.transactions = [result, ...app.transactions];
				showToast('Transaksi berhasil dicatat!', 'success');
			}
			modalOpen = false;
		} catch (err) {
			if (err instanceof TransactionValidationError) {
				for (const e of err.errors) formErrors[e.field] = e.message;
			}
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			app.transactions = app.transactions.map((t) => t.id === id ? { ...t, flagActive: false } : t);
			await withMutation(() => getTransactionRepo().delete(id));
			showToast('Transaksi dihapus', 'success');
			deleteConfirm = null;
		} catch {
			showToast('Gagal menghapus transaksi', 'error');
		}
	}

	onMount(load);
</script>

<svelte:head><title>Transaksi — MemFinance</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-5 sm:space-y-7">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-sm font-medium text-primary-700 dark:text-primary-300">Catatan keuangan</p>
			<h1 class="mt-1 text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">Transaksi</h1>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Telusuri, perbarui, atau tambahkan catatan baru.</p>
		</div>
		<Button size="lg" class="min-h-11 shadow-sm" onclick={openCreate}>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			Tambah transaksi
		</Button>
	</header>

	<StaleIndicator />

	<section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Cari dan filter transaksi">
		<div class="space-y-3 p-3 sm:p-5">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
				<div class="relative flex-1 w-full">
					<label class="sr-only" for="transaction-search">Cari transaksi</label>
					<input id="transaction-search" type="search" placeholder="Cari kategori atau catatan" bind:value={filterSearch}
						class="min-h-11 w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
					<svg class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<select value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy}
						aria-label="Urutkan transaksi" class="hidden min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 sm:block dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
						<option value="date-desc">Terbaru</option>
						<option value="date-asc">Terlama</option>
						<option value="amount-desc">Terbesar</option>
						<option value="amount-asc">Terkecil</option>
					</select>
					<button onclick={load} disabled={app.transactionsRefreshing} class="min-h-11 min-w-11 rounded-xl border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Segarkan transaksi">
						<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
					</button>
					<button onclick={() => showFilters = !showFilters} class="relative min-h-11 min-w-11 rounded-xl border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="{showFilters ? 'Sembunyikan' : 'Tampilkan'} filter" aria-expanded={showFilters}>
						<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
						{#if filterCount > 0}
							<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{filterCount}</span>
						{/if}
					</button>
				</div>
			</div>

			<div class="hidden gap-3 border-t border-gray-100 pt-3 sm:grid sm:grid-cols-4 dark:border-gray-800">
				<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => filterType = (e.target as HTMLSelectElement).value as '' | TransactionType} />
				<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
				<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
				<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
			</div>

			{#if showFilters}
				<div class="border-t border-gray-100 pt-3 sm:hidden dark:border-gray-800" transition:slide={{ duration: 180 }}>
					<div class="grid grid-cols-2 gap-3 pb-3">
						<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => filterType = (e.target as HTMLSelectElement).value as '' | TransactionType} />
						<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
						<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
						<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
					</div>
					<div class="flex items-center gap-2">
						<select value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy}
						class="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
							<option value="date-desc">Urut: Terbaru</option>
							<option value="date-asc">Urut: Terlama</option>
							<option value="amount-desc">Urut: Terbesar</option>
							<option value="amount-asc">Urut: Terkecil</option>
						</select>
						<div class="flex gap-2">
							<button onclick={load} disabled={app.transactionsRefreshing} class="min-h-11 min-w-11 rounded-xl border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300" aria-label="Segarkan transaksi">↻</button>
							{#if filterCount > 0}
								<Button variant="secondary" onclick={clearFilters}>Reset</Button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Daftar transaksi">
		<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5 dark:border-gray-800">
			<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{filteredTransactions.length} transaksi</p>
			{#if filterCount > 0 || filterSearch}<button class="text-sm font-medium text-primary-700 hover:text-primary-800 focus:outline-none focus:underline dark:text-primary-300" onclick={clearFilters}>Bersihkan filter</button>{/if}
		</div>
		{#if app.transactionsLoading && app.transactions.length === 0}
			<div class="space-y-4 p-5">
				{#each [1,2,3,4,5] as _}
					<div class="flex items-center gap-4" transition:fly={{ y: 8, duration: 200 }}>
						<Skeleton width="w-10" height="h-10" class="rounded-full" />
						<div class="flex-1"><Skeleton height="h-4" class="w-1/3 mb-1" /><Skeleton height="h-3" class="w-1/4" /></div>
						<Skeleton height="h-4" class="w-24" />
					</div>
				{/each}
			</div>
		{:else if filteredTransactions.length === 0}
			<div transition:fade={{ duration: 200 }}>
				<EmptyState title={app.transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ditemukan'} description={app.transactions.length === 0 ? 'Yuk catat transaksi pertama kamu!' : 'Coba ubah filter pencarian'} actionLabel={app.transactions.length === 0 ? 'Tambah Transaksi' : undefined} onaction={openCreate} />
			</div>
		{:else}
			<div class="divide-y divide-gray-100 dark:divide-gray-800">
				{#each filteredTransactions as t (t.id)}
					<div class="group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50 focus-within:bg-gray-50 sm:gap-4 sm:p-4 dark:hover:bg-gray-800/50 dark:focus-within:bg-gray-800/50" onclick={(e) => e.target === e.currentTarget || !(e.target as HTMLElement).closest('button') ? openEdit(t) : undefined} role="button" tabindex="0" onkeydown={(e) => {
						if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
						e.preventDefault();
						openEdit(t);
					}}>
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base sm:h-11 sm:w-11" style="background-color: {t.type === 'expense' ? '#FEE2E2' : '#DCFCE7'}">
							<span style="color: {t.type === 'expense' ? '#DC2626' : '#16A34A'}">{t.type === 'expense' ? '↓' : '↑'}</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
								{app.categories.find((c) => c.id === t.categoryId)?.name ?? 'Lainnya'}
								{#if t.id.startsWith('local_')}<span class="ml-1 text-[10px] text-amber-600">(belum sync)</span>{/if}
							</p>
							<p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{t.note || formatDateTime(t.createdAt)}</p>
						</div>
						<div class="text-right shrink-0">
							<p class="whitespace-nowrap text-sm font-bold tabular-nums {t.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}">{t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}</p>
							<p class="mt-0.5 text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
						</div>
						<button onclick={(e) => { e.stopPropagation(); deleteConfirm = t.id; }} class="min-h-10 min-w-10 shrink-0 rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 dark:hover:bg-red-900/20" aria-label="Hapus transaksi">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}
</section>
</div>

<Modal open={modalOpen} title={editMode ? 'Edit Transaksi' : 'Catat Transaksi'} onclose={() => modalOpen = false}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" aria-label="Tipe transaksi">
			<button type="button" onclick={() => formType = 'expense'} class="min-h-10 rounded-lg text-sm font-semibold transition-colors {formType === 'expense' ? 'bg-white text-red-700 shadow-sm dark:bg-gray-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}">Pengeluaran</button>
			<button type="button" onclick={() => formType = 'income'} class="min-h-10 rounded-lg text-sm font-semibold transition-colors {formType === 'income' ? 'bg-white text-green-700 shadow-sm dark:bg-gray-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}">Pemasukan</button>
		</div>
		<div>
			<label for="transaction-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah <span class="text-red-500">*</span></label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
				<input id="transaction-amount" type="text" inputmode="numeric" aria-invalid={formErrors.amount ? 'true' : undefined} placeholder="0" value={formAmount ? parseInt(formAmount).toLocaleString('id-ID') : ''} oninput={formatAmountInput}
					class="min-h-11 w-full rounded-xl border bg-white py-2 pl-10 pr-3 text-sm text-gray-900 transition-colors dark:bg-gray-800 dark:text-gray-100 {formErrors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:outline-none focus:ring-2 focus:ring-primary-500" />
			</div>
			{#if formErrors.amount}<p class="mt-1 text-xs text-red-500">{formErrors.amount}</p>{/if}
		</div>
		<Select label="Kategori" options={filteredCatOptions.map((c) => ({ value: c.id, label: c.name }))} value={formCategory} error={formErrors.categoryId} required onchange={(e) => formCategory = (e.target as HTMLSelectElement).value} />
		<Input label="Tanggal" type="date" value={formDate} error={formErrors.date} required onchange={(e) => formDate = (e.target as HTMLInputElement).value} />
		<Input label="Waktu dibuat" type="datetime-local" value={formCreatedAt} error={formErrors.createdAt} required onchange={(e) => formCreatedAt = (e.target as HTMLInputElement).value} />
		<Input label="Catatan" placeholder="Opsional" value={formNote} error={formErrors.note} oninput={(e) => formNote = (e.target as HTMLInputElement).value} />
		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={() => modalOpen = false}>Batal</Button>
			<Button type="submit" variant="primary" class="flex-1" loading={formLoading}>{editMode ? 'Simpan' : 'Tambah'}</Button>
		</div>
	</form>
</Modal>

<Modal open={deleteConfirm !== null} title="Hapus Transaksi?" onclose={() => deleteConfirm = null}>
	<p class="text-gray-600 dark:text-gray-400 text-sm mb-4">Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.</p>
	<div class="flex gap-3">
		<Button variant="secondary" class="flex-1" onclick={() => deleteConfirm = null}>Batal</Button>
		<Button variant="danger" class="flex-1" onclick={() => deleteConfirm && handleDelete(deleteConfirm)}>Hapus</Button>
	</div>
</Modal>
