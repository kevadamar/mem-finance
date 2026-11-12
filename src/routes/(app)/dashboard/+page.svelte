<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Component } from 'svelte';
	import SummaryCards from '$lib/components/dashboard/SummaryCards.svelte';
	import RecentTransactions from '$lib/components/dashboard/RecentTransactions.svelte';
	import { app, loadTransactionsFromCache, loadCategoriesFromCache, loadBudgetsFromCache } from '$lib/state/app.svelte';
	import { getTransactionRepo, getCategoryRepo, getBudgetRepo } from '$lib/data/repository-factory';

	let ChartPanel = $state<Component | null>(null);
	let BudgetOverview = $state<Component | null>(null);
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

<svelte:head><title>Dashboard · MemFinance</title></svelte:head>

<div class="space-y-5 sm:space-y-6">
	<header class="retro-card p-4 sm:p-6 bg-[var(--surface-1)]">
		<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-text)]">
			<span class="inline-block size-2 rounded-full bg-[var(--brand-fill)] animate-pulse"></span>
			Buku Kas Digital · Ringkasan
		</div>
		<div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 class="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
					{app.user?.user_metadata?.name ? `Hai, ${app.user.user_metadata.name.split(' ')[0]}` : 'Dashboard'}
				</h1>
				<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)]">Pantau arus kas dan budget Anda dalam satu tempat.</p>
			</div>
			<a
				href={resolve('/transactions?new=1')}
				class="retro-btn-push mt-2 sm:mt-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 py-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]"
			>
				<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14" /></svg>
				Catat transaksi
			</a>
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
				<div class="flex h-64 items-center justify-center rounded-2xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-retro-sm)]" aria-live="polite" aria-label="Memuat grafik">
					<div class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-b-[var(--brand-fill)] motion-reduce:animate-none"></div>
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
