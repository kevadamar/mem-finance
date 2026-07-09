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
	import { formatRupiah, formatDate } from '$lib/utils/format';
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
			case 'date-asc': result.sort((a, b) => a.date.localeCompare(b.date)); break;
			case 'amount-desc': result.sort((a, b) => b.amount - a.amount); break;
			case 'amount-asc': result.sort((a, b) => a.amount - b.amount); break;
			default: result.sort((a, b) => b.date.localeCompare(a.date));
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
			note: formNote || undefined
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

<div class="space-y-4 sm:space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Transaksi</h1>
		<Button onclick={openCreate}>+ Tambah</Button>
	</div>

	<StaleIndicator />

	<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
		<div class="p-3 sm:p-4 space-y-3">
			<div class="flex items-center gap-2 sm:gap-3">
				<div class="relative flex-1">
					<input type="text" placeholder="Cari transaksi..." bind:value={filterSearch}
						class="w-full pl-9 pr-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				<div class="hidden sm:flex items-center gap-2 shrink-0">
					<Select label="Urut" options={[{ value: 'date-desc', label: 'Terbaru' }, { value: 'date-asc', label: 'Terlama' }, { value: 'amount-desc', label: 'Terbesar' }, { value: 'amount-asc', label: 'Terkecil' }]} value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy} />
					<Button variant="ghost" onclick={load} disabled={app.transactionsRefreshing} class="mt-5">↻</Button>
				</div>
				<button onclick={() => showFilters = !showFilters} class="relative p-2 mt-5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Filter">
					<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
					{#if filterCount > 0}
						<span class="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{filterCount}</span>
					{/if}
				</button>
			</div>

			<div class="hidden sm:grid sm:grid-cols-4 gap-3">
				<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => filterType = (e.target as HTMLSelectElement).value as '' | TransactionType} />
				<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
				<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
				<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
			</div>

			{#if showFilters}
				<div class="sm:hidden" transition:slide={{ duration: 200 }}>
					<div class="grid grid-cols-2 gap-2 pt-1 pb-2">
						<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => filterType = (e.target as HTMLSelectElement).value as '' | TransactionType} />
						<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
						<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
						<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
					</div>
					<div class="flex items-center gap-2">
						<Select label="Urut" options={[{ value: 'date-desc', label: 'Terbaru' }, { value: 'date-asc', label: 'Terlama' }, { value: 'amount-desc', label: 'Terbesar' }, { value: 'amount-asc', label: 'Terkecil' }]} value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy} />
						<div class="flex gap-2 pt-5">
							<Button variant="ghost" onclick={load} disabled={app.transactionsRefreshing}>↻</Button>
							{#if filterCount > 0}
								<Button variant="secondary" onclick={clearFilters}>Reset</Button>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
		{#if app.transactionsLoading && app.transactions.length === 0}
			<div class="p-5 space-y-4">
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
					<div class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onclick={() => openEdit(t)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openEdit(t)} transition:fly={{ y: 6, duration: 200, delay: 50 }}>
						<div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg shrink-0" style="background-color: {t.type === 'expense' ? '#FEE2E2' : '#DCFCE7'}">
							<span style="color: {t.type === 'expense' ? '#DC2626' : '#16A34A'}">{t.type === 'expense' ? '↓' : '↑'}</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
								{app.categories.find((c) => c.id === t.categoryId)?.name ?? 'Lainnya'}
								{#if t.id.startsWith('local_')}<span class="ml-1 text-[10px] text-amber-600">(belum sync)</span>{/if}
							</p>
							<p class="text-xs text-gray-500 truncate">{t.note || formatDate(t.date)}</p>
						</div>
						<div class="text-right shrink-0">
							<p class="text-sm font-semibold {t.type === 'expense' ? 'text-red-600' : 'text-green-600'} whitespace-nowrap">{t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}</p>
							<p class="text-xs text-gray-400">{formatDate(t.date)}</p>
						</div>
						<button onclick={(e) => { e.stopPropagation(); deleteConfirm = t.id; }} class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0" aria-label="Hapus">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<Modal open={modalOpen} title={editMode ? 'Edit Transaksi' : 'Catat Transaksi'} onclose={() => modalOpen = false}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="flex gap-2">
			<button type="button" onclick={() => formType = 'expense'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {formType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
			<button type="button" onclick={() => formType = 'income'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {formType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
		</div>
		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah <span class="text-red-500">*</span></label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
				<input type="text" inputmode="numeric" placeholder="0" value={formAmount ? parseInt(formAmount).toLocaleString('id-ID') : ''} oninput={formatAmountInput}
					class="w-full pl-10 pr-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 {formErrors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} focus:outline-none focus:ring-2 focus:ring-primary-500" />
			</div>
			{#if formErrors.amount}<p class="mt-1 text-xs text-red-500">{formErrors.amount}</p>{/if}
		</div>
		<Select label="Kategori" options={filteredCatOptions.map((c) => ({ value: c.id, label: c.name }))} value={formCategory} error={formErrors.categoryId} required onchange={(e) => formCategory = (e.target as HTMLSelectElement).value} />
		<Input label="Tanggal" type="date" value={formDate} error={formErrors.date} required onchange={(e) => formDate = (e.target as HTMLInputElement).value} />
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
