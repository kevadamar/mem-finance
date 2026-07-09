<script lang="ts">
	import { onMount } from 'svelte';
	import SummaryCards from '$lib/components/dashboard/SummaryCards.svelte';
	import RecentTransactions from '$lib/components/dashboard/RecentTransactions.svelte';
	import { app, loadTransactionsFromCache, loadCategoriesFromCache, loadBudgetsFromCache } from '$lib/state/app.svelte';
	import { getTransactionRepo, getCategoryRepo, getBudgetRepo } from '$lib/data/repository-factory';

	let ChartPanel: typeof import('$lib/components/charts/PieChartPanel.svelte').default | undefined = $state();
	let BudgetOverview: typeof import('$lib/components/charts/BudgetOverview.svelte').default | undefined = $state();
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

<div class="space-y-6">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
	<SummaryCards />
	{#if loaded && BudgetOverview}
		<BudgetOverview />
	{/if}
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2">
			{#if loaded && ChartPanel}
				<ChartPanel />
			{:else}
				<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 h-64 flex items-center justify-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
				</div>
			{/if}
		</div>
		<div><RecentTransactions /></div>
	</div>
</div>
