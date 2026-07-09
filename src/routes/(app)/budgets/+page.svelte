<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { getTransactionRepo, getCategoryRepo, getBudgetRepo, invalidateBudgetCache } from '$lib/data/repository-factory';
	import * as idb from '$lib/data/idb';
	import { STORES } from '$lib/data/idb';
	import { app, loadCategoriesFromCache, loadTransactionsFromCache, loadBudgetsFromCache, showToast, withMutation } from '$lib/state/app.svelte';
	import { formatRupiah, formatDateTime } from '$lib/utils/format';
	import type { Budget, BudgetSummary } from '$lib/domain/entities/budget';

	let month = $state(new Date().getMonth() + 1);
	let year = $state(new Date().getFullYear());

	let modalOpen = $state(false);
	let editBudgetId = $state<string | null>(null);
	let formCat = $state('');
	let formAmount = $state('');

	let isEditing = $derived(editBudgetId !== null);
	let formTitle = $derived(isEditing ? 'Edit Budget' : 'Tambah Budget');

	const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

	let expenseCats = $derived(app.categories.filter((c) => c.type === 'expense'));

	let summaries = $derived.by<BudgetSummary[]>(() => {
		const monthlyBudgets = app.budgets.filter((b) => Number(b.month) === month && Number(b.year) === year);
		const monthlyExpenses = app.transactions.filter((t) => {
			const d = new Date(t.date);
			return t.type === 'expense' && d.getMonth() + 1 === month && d.getFullYear() === year;
		});

		return monthlyBudgets.map((budget) => {
			const category = app.categories.find((c) => c.id === budget.categoryId);
			const spent = monthlyExpenses.filter((t) => t.categoryId === budget.categoryId).reduce((sum, t) => sum + t.amount, 0);
			return {
				categoryId: budget.categoryId,
				categoryName: category?.name ?? 'Unknown',
				categoryColor: category?.color ?? '#6B7280',
				budgetAmount: budget.amount,
				spentAmount: spent,
				remainingAmount: budget.amount - spent,
				percentage: Math.min(Math.round((spent / budget.amount) * 100), 100)
			};
		});
	});

	let unbudgetedCats = $derived(expenseCats.filter((c) => !summaries.some((s) => s.categoryId === c.id)));

	let availableCats = $derived(isEditing ? expenseCats : unbudgetedCats);

	let detailBudgetSummary = $state<BudgetSummary | null>(null);

	let detailTransactions = $derived.by(() => {
		const s = detailBudgetSummary;
		if (!s) return [];
		return app.transactions
			.filter((t) => {
				if (t.categoryId !== s.categoryId) return false;
				if (t.type !== 'expense') return false;
				const d = new Date(t.date);
				return d.getMonth() + 1 === month && d.getFullYear() === year;
			})
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	});

	let detailMonthIncome = $derived(
		app.transactions
			.filter((t) => {
				if (t.type !== 'income') return false;
				const d = new Date(t.date);
				return d.getMonth() + 1 === month && d.getFullYear() === year;
			})
			.reduce((s, t) => s + t.amount, 0)
	);

	let inactiveBudgets = $state<Budget[]>([]);

	async function loadInactive() {
		const all = await idb.getAll<Budget>(STORES.BUDGETS);
		inactiveBudgets = all.filter((b) => b.flagActive === false);
	}

	let _monthLoading = false;

	async function load() {
		await Promise.all([loadCategoriesFromCache(), loadTransactionsFromCache(), loadBudgetsFromCache()]);

		const hadEmptyBudgets = app.budgets.length === 0;
		if (hadEmptyBudgets) app.budgetsLoading = true;
		app.budgetsStale = false;

		const [catsResult, txsResult, budgetsResult] = await Promise.allSettled([
			getCategoryRepo().getAll(),
			getTransactionRepo().getAll(),
			getBudgetRepo().getAll()
		]);

		if (catsResult.status === 'fulfilled') app.categories = catsResult.value;
		if (txsResult.status === 'fulfilled') app.transactions = txsResult.value;

		if (budgetsResult.status === 'fulfilled') {
			app.budgets = budgetsResult.value;
		} else if (hadEmptyBudgets) {
			app.budgetsStale = true;
		}

		app.budgetsLoading = false;
	}

	onMount(() => { load(); loadInactive(); });

	async function ensureMonthData(cm: number, cy: number) {
		if (_monthLoading) return;
		const has = app.budgets.some((b) => Number(b.month) === cm && Number(b.year) === cy);
		if (has || app.budgets.length === 0) return;

		_monthLoading = true;
		app.budgetsLoading = true;
		app.budgetsStale = false;

		invalidateBudgetCache();
		try {
			const budgets = await getBudgetRepo().getAll();
			app.budgets = budgets;
		} catch { /* keep current */ }

		app.budgetsLoading = false;
		_monthLoading = false;
	}

	function prevMonth() {
		if (month === 1) { month = 12; year--; } else month--;
		ensureMonthData(month, year);
	}
	function nextMonth() {
		if (month === 12) { month = 1; year++; } else month++;
		ensureMonthData(month, year);
	}

	function openAdd() {
		editBudgetId = null;
		formCat = '';
		formAmount = '';
		modalOpen = true;
	}

	function openEdit(s: BudgetSummary) {
		closeDetail();
		const budget = app.budgets.find((b) => b.categoryId === s.categoryId && Number(b.month) === month && Number(b.year) === year);
		if (!budget) return;
		editBudgetId = budget.id;
		formCat = budget.categoryId;
		formAmount = String(budget.amount);
		modalOpen = true;
	}

	async function saveBudget() {
		const amount = parseInt(formAmount, 10);
		if (!formCat || isNaN(amount) || amount <= 0) return;
		try {
			if (isEditing && editBudgetId) {
				const id: string = editBudgetId;
				const result = await withMutation(() => getBudgetRepo().update(id, { amount }));
				app.budgets = app.budgets.map((b) => b.id === editBudgetId ? result : b);
				showToast('Budget diperbarui', 'success');
			} else {
				const result = await withMutation(() => getBudgetRepo().create({ categoryId: formCat, amount, month, year }));
				app.budgets = [...app.budgets, result];
				showToast('Budget ditambahkan', 'success');
			}
			modalOpen = false;
		} catch {
			showToast(isEditing ? 'Gagal memperbarui budget' : 'Gagal menambah budget', 'error');
		}
	}

	async function restoreBudget(id: string) {
		try {
			const budget = await idb.getOne<Budget>(STORES.BUDGETS, id);
			if (!budget) return;
			const restored = await withMutation(() => getBudgetRepo().restore(id));
			app.budgets = [...app.budgets, restored];
			inactiveBudgets = inactiveBudgets.filter((b) => b.id !== id);
			showToast('Budget dipulihkan', 'success');
		} catch {
			showToast('Gagal memulihkan budget', 'error');
		}
	}

	async function removeBudget(catId: string | null) {
		if (!catId) return;
		const budget = app.budgets.find((b) => b.categoryId === catId && Number(b.month) === month && Number(b.year) === year);
		if (!budget) return;
		try {
			app.budgets = app.budgets.filter((b) => b.id !== budget.id);
			await withMutation(() => getBudgetRepo().delete(budget.id));
			showToast('Budget dihapus', 'success');
		} catch {
			showToast('Gagal menghapus budget', 'error');
		}
	}

	function openDetail(s: BudgetSummary) {
		detailBudgetSummary = s;
	}

	function closeDetail() {
		detailBudgetSummary = null;
	}
</script>

<svelte:head><title>Budget — MemFinance</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget</h1>
		<Button onclick={openAdd} disabled={unbudgetedCats.length === 0}><span class="hidden sm:inline">+ Tambah Budget</span><span class="sm:hidden">+ Budget</span></Button>
	</div>

	<div class="flex items-center justify-center gap-4">
		<button onclick={prevMonth} aria-label="Bulan sebelumnya" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
		<span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthNames[month - 1]} {year}</span>
		<button onclick={nextMonth} aria-label="Bulan berikutnya" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
	</div>
	{#if app.budgetsStale}
		<div class="text-center text-xs text-amber-600 dark:text-amber-400">
			Data tidak dapat dimuat dari server. Menampilkan data tersimpan.
			<button onclick={load} class="underline ml-1">Coba lagi</button>
		</div>
	{/if}

	{#if app.budgetsLoading && app.budgets.length === 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each [1,2,3,4] as _}<Card><Skeleton height="h-4" class="w-1/2 mb-3" /><Skeleton height="h-3" class="mb-2" /><Skeleton height="h-6" /></Card>{/each}
		</div>
	{:else if summaries.length === 0}
		<EmptyState title="Belum ada budget" description="Buat budget untuk mengontrol pengeluaran bulan ini" actionLabel="Tambah Budget" onaction={openAdd} />
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each summaries as s}
				<Card>
					<div role="button" tabindex="0" class="cursor-pointer" onclick={() => openDetail(s)} onkeydown={(e) => e.key === 'Enter' && openDetail(s)}>
						<div class="flex items-center justify-between mb-2">
							<div class="flex items-center gap-2 min-w-0">
								<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {s.categoryColor}"></div>
								<span class="font-medium text-gray-900 dark:text-gray-100 truncate">{s.categoryName}</span>
							</div>
							<button onclick={(e) => { e.stopPropagation(); removeBudget(s.categoryId); }} class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg shrink-0" aria-label="Hapus budget">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
						<ProgressBar value={s.spentAmount} max={s.budgetAmount} class="mb-2" />
						<div class="flex items-center justify-between gap-2 text-xs text-gray-500">
							<span class="truncate">Terpakai {formatRupiah(s.spentAmount)}</span>
							<span class="shrink-0">Sisa {formatRupiah(s.remainingAmount)}</span>
						</div>
						<p class="text-right text-xs text-gray-400 mt-1">dari {formatRupiah(s.budgetAmount)}</p>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	{#if inactiveBudgets.length > 0}
		<div class="pt-2">
			<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Budget Nonaktif</p>
			<div class="space-y-2">
				{#each inactiveBudgets.filter((b) => Number(b.month) === month && Number(b.year) === year) as b}
					<div class="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-2 min-w-0">
							<span class="text-sm text-gray-500 dark:text-gray-400 line-through truncate">{app.categories.find((c) => c.id === b.categoryId)?.name ?? 'Unknown'}</span>
							<span class="text-xs text-gray-400">{formatRupiah(b.amount)}</span>
						</div>
						<button onclick={() => restoreBudget(b.id)} class="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shrink-0">Pulihkan</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<Modal open={modalOpen} title={formTitle} onclose={() => modalOpen = false}>
	<div class="space-y-4">
		<Select label="Kategori" options={availableCats.map((c) => ({ value: c.id, label: c.name }))} value={formCat} required disabled={isEditing} onchange={(e) => formCat = (e.target as HTMLSelectElement).value} />
		<Input label="Limit Budget" type="number" placeholder="Masukkan nominal" value={formAmount} oninput={(e) => formAmount = (e.target as HTMLInputElement).value} />
		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={() => modalOpen = false}>Batal</Button>
			<Button variant="primary" class="flex-1" onclick={saveBudget} disabled={!formCat || !formAmount}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
		</div>
	</div>
</Modal>

<Modal open={detailBudgetSummary !== null} title={detailBudgetSummary?.categoryName ?? ''} onclose={closeDetail}>
	{#if detailBudgetSummary}
		<div class="space-y-4">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center sm:text-center">
				<div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
					<p class="text-xs text-gray-500">Budget</p>
					<p class="text-sm font-bold text-gray-900 dark:text-gray-100 break-all">{formatRupiah(detailBudgetSummary.budgetAmount)}</p>
				</div>
				<div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
					<p class="text-xs text-gray-500">Terpakai</p>
					<p class="text-sm font-bold text-red-600 break-all">{formatRupiah(detailBudgetSummary.spentAmount)}</p>
				</div>
				<div class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
					<p class="text-xs text-gray-500">Sisa</p>
					<p class="text-sm font-bold {detailBudgetSummary.remainingAmount >= 0 ? 'text-green-600' : 'text-orange-600'} break-all">{formatRupiah(detailBudgetSummary.remainingAmount)}</p>
				</div>
			</div>
			<ProgressBar value={detailBudgetSummary.spentAmount} max={detailBudgetSummary.budgetAmount} />
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 text-xs text-gray-500">
				<span>{detailBudgetSummary.percentage}% terpakai</span>
				<span class="sm:text-right">Pemasukan bulan ini: <span class="font-semibold text-green-600">{formatRupiah(detailMonthIncome)}</span></span>
			</div>
			<hr class="border-gray-200 dark:border-gray-800" />
			<div class="flex gap-2">
				<Button variant="secondary" class="flex-1" onclick={() => detailBudgetSummary && openEdit(detailBudgetSummary)}>Edit Budget</Button>
				<Button variant="danger" class="flex-1" onclick={() => { if (detailBudgetSummary) { removeBudget(detailBudgetSummary.categoryId); closeDetail(); } }}>Hapus</Button>
			</div>
			<hr class="border-gray-200 dark:border-gray-800" />
			<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Transaksi Pengeluaran</h4>
			{#if detailTransactions.length === 0}
				<p class="text-sm text-gray-400 text-center py-4">Belum ada transaksi untuk kategori ini</p>
			{:else}
				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each detailTransactions as t}
						<div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.note || 'Tanpa catatan'}</p>
								<p class="text-xs text-gray-400">{formatDateTime(t.date)}</p>
							</div>
							<p class="text-sm font-semibold text-red-600 ml-3 shrink-0">{formatRupiah(t.amount)}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</Modal>
