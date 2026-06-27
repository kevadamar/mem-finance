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
	import { getTransactionRepo, getCategoryRepo, getBudgetRepo } from '$lib/data/repository-factory';
	import { app, loadCategoriesFromCache, loadTransactionsFromCache, loadBudgetsFromCache, showToast, withMutation } from '$lib/state/app.svelte';
	import { formatRupiah } from '$lib/utils/format';
	import type { Budget, BudgetSummary } from '$lib/domain/entities/budget';

	let month = $state(new Date().getMonth() + 1);
	let year = $state(new Date().getFullYear());

	let modalOpen = $state(false);
	let formCat = $state('');
	let formAmount = $state('');

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

	async function load() {
		await Promise.all([loadCategoriesFromCache(), loadTransactionsFromCache(), loadBudgetsFromCache()]);
		try {
			const [cats, txs, budgets] = await Promise.all([
				getCategoryRepo().getAll(),
				getTransactionRepo().getAll(),
				getBudgetRepo().getAll()
			]);
			app.categories = cats;
			app.transactions = txs;
			app.budgets = budgets;
		} catch { /* keep cached */ }
	}

	onMount(load);

	function prevMonth() { if (month === 1) { month = 12; year--; } else month--; }
	function nextMonth() { if (month === 12) { month = 1; year++; } else month++; }

	function openAdd() {
		formCat = '';
		formAmount = '';
		modalOpen = true;
	}

	async function addBudget() {
		const amount = parseInt(formAmount, 10);
		if (!formCat || isNaN(amount) || amount <= 0) return;
		try {
			const result = await withMutation(() => getBudgetRepo().create({ categoryId: formCat, amount, month, year }));
			app.budgets = [...app.budgets, result];
			modalOpen = false;
			showToast('Budget ditambahkan', 'success');
		} catch {
			showToast('Gagal menambah budget', 'error');
		}
	}

	async function removeBudget(catId: string) {
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
</script>

<svelte:head><title>Budget — MemFinance</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget</h1>
		<Button onclick={openAdd} disabled={unbudgetedCats.length === 0}>+ Tambah Budget</Button>
	</div>

	<div class="flex items-center justify-center gap-4">
		<button onclick={prevMonth} aria-label="Bulan sebelumnya" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button>
		<span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthNames[month - 1]} {year}</span>
		<button onclick={nextMonth} aria-label="Bulan berikutnya" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg></button>
	</div>

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
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-full" style="background-color: {s.categoryColor}"></div>
							<span class="font-medium text-gray-900 dark:text-gray-100">{s.categoryName}</span>
						</div>
						<button onclick={() => removeBudget(s.categoryId)} class="text-gray-400 hover:text-red-500" aria-label="Hapus budget">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						</button>
					</div>
					<ProgressBar value={s.spentAmount} max={s.budgetAmount} class="mb-2" />
					<div class="flex items-center justify-between text-xs text-gray-500">
						<span>Terpakai {formatRupiah(s.spentAmount)}</span>
						<span>Sisa {formatRupiah(s.remainingAmount)}</span>
					</div>
					<p class="text-right text-xs text-gray-400 mt-1">dari {formatRupiah(s.budgetAmount)}</p>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<Modal open={modalOpen} title="Tambah Budget" onclose={() => modalOpen = false}>
	<div class="space-y-4">
		<Select label="Kategori" options={unbudgetedCats.map((c) => ({ value: c.id, label: c.name }))} value={formCat} required onchange={(e) => formCat = (e.target as HTMLSelectElement).value} />
		<Input label="Limit Budget" type="number" placeholder="Masukkan nominal" value={formAmount} oninput={(e) => formAmount = (e.target as HTMLInputElement).value} />
		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={() => modalOpen = false}>Batal</Button>
			<Button variant="primary" class="flex-1" onclick={addBudget} disabled={!formCat || !formAmount}>Simpan</Button>
		</div>
	</div>
</Modal>
