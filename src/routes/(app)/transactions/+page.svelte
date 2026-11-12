<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, slide, fly } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import StaleIndicator from '$lib/components/ui/StaleIndicator.svelte';
	import { getTransactionRepo, getCategoryRepo } from '$lib/data/repository-factory';
	import { TransactionValidationError } from '$lib/domain/usecases/create-transaction.usecase';
	import { validateTransaction } from '$lib/domain/validators/transaction.validator';
	import { app, loadTransactionsFromCache, loadCategoriesFromCache, showToast, withMutation } from '$lib/state/app.svelte';
	import { formatRupiah, formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '$lib/utils/format';
	import type { Transaction, TransactionType, CreateTransactionInput, UpdateTransactionInput } from '$lib/domain/entities/transaction';

	let filterType = $state<'' | TransactionType>('');
	let filterCategory = $state('');
	let filterStart = $state('');
	let filterEnd = $state('');
	let filterSearch = $state('');
	let sortBy = $state<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

	let showFilters = $state(false);
	let filterCount = $derived([filterType, filterCategory, filterStart, filterEnd].filter(Boolean).length);
	let filterDateError = $derived(Boolean(filterStart && filterEnd && filterStart > filterEnd));

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

	$effect(() => {
		if ($page.url.searchParams.has('new')) {
			openCreate();
			const url = new URL(window.location.href);
			url.searchParams.delete('new');
			window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
		}

		const targetId = $page.url.searchParams.get('id');
		if (targetId && app.transactions.length > 0) {
			const tx = app.transactions.find((t) =>
				t.id === targetId ||
				(targetId.startsWith('local_') && t.id === targetId.replace('local_', '')) ||
				(`local_${t.id}` === targetId)
			);
			if (tx) {
				openEdit(tx);
				const url = new URL(window.location.href);
				url.searchParams.delete('id');
				window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
			}
		}
	});

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

	function setFilterType(value: '' | TransactionType) {
		filterType = value;
		if (filterCategory && !app.categories.some((category) => category.id === filterCategory && (!value || category.type === value))) {
			filterCategory = '';
		}
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

	onMount(() => {
		load();
		const handleOpenCreate = () => openCreate();
		window.addEventListener('memfinance-open-create-transaction', handleOpenCreate);
		return () => window.removeEventListener('memfinance-open-create-transaction', handleOpenCreate);
	});
</script>

<svelte:head><title>Transaksi · MemFinance</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-5 sm:space-y-7">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-text)]">
				<span class="inline-block size-1.5 rounded-full bg-[var(--brand-fill)]"></span>
				Buku Kas · Catatan
			</div>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Transaksi</h1>
			<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)]">Telusuri, perbarui, atau tambahkan catatan baru.</p>
		</div>
		<Button size="lg" class="min-h-11 shadow-[var(--shadow-retro-sm)]" onclick={openCreate}>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
			Tambah transaksi
		</Button>
	</header>

	<StaleIndicator />

	<section class="retro-card overflow-hidden bg-[var(--surface-1)] p-3 sm:p-5" aria-label="Cari dan filter transaksi">
		<div class="space-y-3">
			<div class="flex items-center gap-2 sm:gap-3">
				<div class="relative flex-1 min-w-0">
					<label class="sr-only" for="transaction-search">Cari transaksi</label>
					<input id="transaction-search" type="search" placeholder="Cari kategori atau catatan..." bind:value={filterSearch}
						class="min-h-11 w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] py-2.5 pl-10 pr-3 font-sans text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-[var(--shadow-retro-sm)] focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
					<svg class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<select value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy}
						aria-label="Urutkan transaksi" class="hidden min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] pl-3.5 pr-10 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none sm:block">
						<option value="date-desc">Terbaru</option>
						<option value="date-asc">Terlama</option>
						<option value="amount-desc">Terbesar</option>
						<option value="amount-asc">Terkecil</option>
					</select>
					<button onclick={load} disabled={app.transactionsRefreshing}
						class="retro-btn-push grid size-11 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50"
						aria-label="Segarkan transaksi"
						title="Segarkan transaksi">
						<svg class="size-5 text-[var(--text-secondary)] {app.transactionsRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
					</button>
					<button onclick={() => showFilters = !showFilters}
						class="retro-btn-push relative grid size-11 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] shadow-[var(--shadow-retro-sm)] sm:hidden {showFilters || filterCount > 0 ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300' : 'bg-[var(--surface-1)] text-[var(--text-secondary)]'}"
						aria-label="{showFilters ? 'Sembunyikan' : 'Tampilkan'} filter"
						aria-expanded={showFilters}
						title="{showFilters ? 'Sembunyikan' : 'Tampilkan'} filter">
						<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
						{#if filterCount > 0}
							<span class="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--brand-fill)] px-1 font-mono text-[10px] font-bold text-[var(--on-brand)] shadow-xs">{filterCount}</span>
						{/if}
					</button>
				</div>
			</div>

			<div class="hidden gap-3 border-t-[1.5px] border-[var(--border-subtle)] pt-3 sm:grid sm:grid-cols-4">
				<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => setFilterType((e.target as HTMLSelectElement).value as '' | TransactionType)} />
				<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
				<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
				<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
				{#if filterDateError}<p class="col-span-4 font-mono text-xs font-bold text-danger-600 dark:text-danger-400">Tanggal mulai harus lebih awal atau sama dengan tanggal akhir.</p>{/if}
			</div>

			{#if showFilters}
				<div class="border-t-[1.5px] border-[var(--border-subtle)] pt-3 sm:hidden" transition:slide={{ duration: 180 }}>
					<div class="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 sm:gap-3 pb-3">
						<Select label="Tipe" options={[{ value: '', label: 'Semua' }, { value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }]} value={filterType} onchange={(e) => setFilterType((e.target as HTMLSelectElement).value as '' | TransactionType)} />
						<Select label="Kategori" options={[{ value: '', label: 'Semua' }, ...app.categories.filter((c) => !filterType || c.type === filterType).map((c) => ({ value: c.id, label: c.name }))]} value={filterCategory} onchange={(e) => filterCategory = (e.target as HTMLSelectElement).value} />
						<Input label="Dari" type="date" value={filterStart} onchange={(e) => filterStart = (e.target as HTMLInputElement).value} />
						<Input label="Sampai" type="date" value={filterEnd} onchange={(e) => filterEnd = (e.target as HTMLInputElement).value} />
						{#if filterDateError}<p class="col-span-1 min-[360px]:col-span-2 font-mono text-xs font-bold text-danger-600 dark:text-danger-400">Tanggal mulai harus lebih awal atau sama dengan tanggal akhir.</p>{/if}
					</div>
					<div class="flex items-center gap-2">
						<select value={sortBy} onchange={(e) => sortBy = (e.target as HTMLSelectElement).value as typeof sortBy}
						class="min-h-11 flex-1 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] pl-3.5 pr-10 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none">
							<option value="date-desc">Urut: Terbaru</option>
							<option value="date-asc">Urut: Terlama</option>
							<option value="amount-desc">Urut: Terbesar</option>
							<option value="amount-asc">Urut: Terkecil</option>
						</select>
						{#if filterCount > 0}
							<Button variant="secondary" onclick={clearFilters}>Reset</Button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="retro-card overflow-hidden bg-[var(--surface-1)]" aria-label="Daftar transaksi">
		<div class="flex items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-3 sm:px-5">
			<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Daftar Transaksi · {filteredTransactions.length} Total</p>
			{#if filterCount > 0 || filterSearch}<button class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)] hover:underline focus:outline-none" onclick={clearFilters}>Reset Filter</button>{/if}
		</div>
		{#if app.transactionsLoading && app.transactions.length === 0}
			<div class="space-y-4 p-5">
				{#each [1,2,3,4,5] as _ (_)}
					<div class="flex items-center gap-4" transition:fly={{ y: 8, duration: 200 }}>
						<Skeleton width="w-10" height="h-10" class="rounded-lg" />
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
			<div class="divide-y divide-dashed divide-[var(--border-subtle)]">
				{#each filteredTransactions as t (t.id)}
					{@const category = app.categories.find((c) => c.id === t.categoryId)}
					<div class="group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-[var(--surface-2)]/60 focus-within:bg-[var(--surface-2)]/60 sm:gap-4 sm:p-4" onclick={(e) => e.target === e.currentTarget || !(e.target as HTMLElement).closest('button') ? openEdit(t) : undefined} role="button" tabindex="0" onkeydown={(e) => {
						if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
						e.preventDefault();
						openEdit(t);
					}}>
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] font-mono text-sm font-black shadow-[var(--shadow-retro-sm)] sm:h-11 sm:w-11 {t.type === 'expense' ? 'bg-danger-50 text-[var(--expense-fg)] dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-[var(--income-fg)] dark:bg-emerald-950/40 dark:text-emerald-300'}" aria-hidden="true">
							<span>{t.type === 'expense' ? '↓' : '↑'}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-1.5">
								{#if category?.color}
									<span class="inline-block size-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10" style="background-color: {category.color}"></span>
								{/if}
								<p class="truncate text-sm font-bold text-[var(--text-primary)]">
									{category?.name ?? 'Lainnya'}
									{#if t.id.startsWith('local_')}<span class="ml-1 font-mono text-[10px] font-normal text-amber-600 dark:text-amber-400">(belum sync)</span>{/if}
								</p>
							</div>
							<p class="mt-0.5 truncate font-mono text-xs text-[var(--text-secondary)]">{t.note || formatDateTime(t.createdAt)}</p>
						</div>
						<div class="text-right shrink-0">
							<p class="whitespace-nowrap font-mono text-sm font-bold tabular-nums tracking-tight {t.type === 'expense' ? 'text-[var(--expense-fg)]' : 'text-[var(--income-fg)]'}">{t.type === 'expense' ? '−' : '+'}{formatRupiah(t.amount)}</p>
							<p class="mt-0.5 font-mono text-[11px] text-[var(--text-secondary)]">{t.date || formatDateTime(t.createdAt)}</p>
						</div>
						<button onclick={(e) => { e.stopPropagation(); deleteConfirm = t.id; }} class="retro-btn-push hidden sm:grid min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-danger-50 hover:text-danger-600 focus:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 dark:hover:bg-danger-950/40" aria-label="Hapus transaksi">
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
		<div class="grid grid-cols-2 gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-1.5 shadow-[var(--shadow-retro-sm)]" aria-label="Tipe transaksi">
			<button
				type="button"
				onclick={() => { formType = 'expense'; formCategory = ''; }}
				class="min-h-10 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all {formType === 'expense' ? 'border-[1.5px] border-[var(--border-strong)] bg-danger-50 text-danger-700 shadow-[var(--shadow-retro-sm)] dark:bg-danger-950/60 dark:text-danger-300' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				↓ Pengeluaran
			</button>
			<button
				type="button"
				onclick={() => { formType = 'income'; formCategory = ''; }}
				class="min-h-10 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all {formType === 'income' ? 'border-[1.5px] border-[var(--border-strong)] bg-emerald-50 text-emerald-800 shadow-[var(--shadow-retro-sm)] dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				↑ Pemasukan
			</button>
		</div>
		<div>
			<label for="transaction-amount" class="mb-1.5 block font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
				Nominal Transaksi <span class="font-bold text-danger-600">*</span>
			</label>
			<div class="relative">
				<span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[var(--text-tertiary)]">Rp</span>
				<input
					id="transaction-amount"
					type="text"
					inputmode="numeric"
					aria-invalid={formErrors.amount ? 'true' : undefined}
					placeholder="0"
					value={formAmount ? parseInt(formAmount).toLocaleString('id-ID') : ''}
					oninput={formatAmountInput}
					class="min-h-11 w-full rounded-xl border-[1.5px] bg-[var(--surface-1)] py-2 pl-11 pr-3 font-mono text-base font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition-[border-color,box-shadow] {formErrors.amount ? 'border-danger-600 ring-1 ring-danger-600/30' : 'border-[var(--border-strong)] focus:border-primary-600 focus:outline-none focus:shadow-[var(--shadow-retro)]'} sm:text-lg"
				/>
			</div>
			{#if formErrors.amount}<p class="mt-1 font-mono text-xs font-bold text-danger-600">{formErrors.amount}</p>{/if}
		</div>
		<Select label="Kategori" options={filteredCatOptions.map((c) => ({ value: c.id, label: c.name }))} value={formCategory} error={formErrors.categoryId} required onchange={(e) => formCategory = (e.target as HTMLSelectElement).value} />
		<Input label="Tanggal" type="date" value={formDate} error={formErrors.date} required onchange={(e) => formDate = (e.target as HTMLInputElement).value} />
		<Input label="Waktu dibuat" type="datetime-local" value={formCreatedAt} error={formErrors.createdAt} required onchange={(e) => formCreatedAt = (e.target as HTMLInputElement).value} />
		<Input label="Catatan" placeholder="Opsional" value={formNote} error={formErrors.note} oninput={(e) => formNote = (e.target as HTMLInputElement).value} />
		<div class="flex items-center gap-2 pt-2">
			{#if editMode}
				<Button type="button" variant="danger" class="shrink-0" onclick={() => { if (editId) { modalOpen = false; deleteConfirm = editId; } }}>Hapus</Button>
			{/if}
			<Button type="button" variant="secondary" class="flex-1" onclick={() => modalOpen = false}>Batal</Button>
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
