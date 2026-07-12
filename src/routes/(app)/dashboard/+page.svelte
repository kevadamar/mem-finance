<script lang="ts">
	import { onMount } from 'svelte';
	import SummaryCards from '$lib/components/dashboard/SummaryCards.svelte';
	import RecentTransactions from '$lib/components/dashboard/RecentTransactions.svelte';
	import { app, loadTransactionsFromCache, loadCategoriesFromCache, loadBudgetsFromCache } from '$lib/state/app.svelte';
	import { getTransactionRepo, getCategoryRepo, getBudgetRepo } from '$lib/data/repository-factory';

	let ChartPanel: any = $state();
	let BudgetOverview: any = $state();
	let loaded = $state(false);

	async function loadAll() {
		await Promise.all([loadTransactionsFromCache(), loadCategoriesFromCache(), loadBudgetsFromCache()]);
		app.transactionsLoading = app.transactions.length === 0;
		try {
			const [txs, cats, budgets] = await Promise.allSettled([
				getTransactionRepo().getAll(),
				getCategoryRepo().getAll(),
				getBudgetRepo().getAll()
			]);
			if (txs.status === 'fulfilled') app.transactions = txs.value;
			if (cats.status === 'fulfilled') app.categories = cats.value;
			if (budgets.status === 'fulfilled') app.budgets = budgets.value;
			app.transactionsStale = false;
		} catch {
			if (app.transactions.length > 0) app.transactionsStale = true;
		} finally {
			app.transactionsLoading = false;
		}
	}

	onMount(async () => {
		const [chartMod, budgetMod] = await Promise.all([
			import('$lib/components/charts/PieChartPanel.svelte'),
			import('$lib/components/charts/BudgetOverview.svelte')
		]);
		ChartPanel = chartMod.default;
		BudgetOverview = budgetMod.default;
		loaded = true;

		await loadAll();
	});

	onMount(() => {
		function onDataChange() {
			loadTransactionsFromCache();
			loadCategoriesFromCache();
		}
		window.addEventListener('memfinance-data-changed', onDataChange);
		return () => window.removeEventListener('memfinance-data-changed', onDataChange);
	});
</script>

<svelte:head><title>Dashboard — MemFinance</title></svelte:head>

<div class="space-y-5 sm:space-y-6">
	<header class="rounded-2xl border border-primary-100 bg-gradient-to-br from-white via-primary-50/70 to-sky-50 px-5 py-5 shadow-sm dark:border-primary-900/60 dark:from-gray-900 dark:via-primary-950/40 dark:to-gray-900 sm:px-6">
		<p class="text-sm font-medium text-primary-700 dark:text-primary-300">Ringkasan keuangan</p>
		<div class="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">Dashboard</h1>
				<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Pantau arus kas dan budget Anda dalam satu tempat.</p>
			</div>
			<a href="/transactions" class="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 motion-reduce:transition-none dark:focus:ring-offset-gray-900 sm:mt-0">Catat transaksi</a>
		</div>
	</header>
	<SummaryCards />
	{#if loaded && BudgetOverview}
		<div class="motion-safe:animate-enter">
			<BudgetOverview />
		</div>
	{/if}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2">
			{#if loaded && ChartPanel}
				<div class="motion-safe:animate-enter">
					<ChartPanel />
				</div>
			{:else}
				<div class="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-live="polite" aria-label="Memuat grafik">
					<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-100 border-b-primary-600 motion-reduce:animate-none dark:border-primary-950"></div>
				</div>
			{/if}
		</div>
		<div class="motion-safe:animate-enter">
			<RecentTransactions />
		</div>
	</div>
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(0.5rem); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
