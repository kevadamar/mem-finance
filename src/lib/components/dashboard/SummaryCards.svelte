<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import StaleIndicator from '$lib/components/ui/StaleIndicator.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah } from '$lib/utils/format';

	let summary = $derived.by(() => {
		const txs = app.transactions;
		const now = new Date();
		const cm = now.getMonth();
		const cy = now.getFullYear();
		let totalIncome = 0;
		let totalExpense = 0;
		let monthIncome = 0;
		let monthExpense = 0;
		for (const t of txs) {
			if (t.type === 'income') totalIncome += t.amount;
			else totalExpense += t.amount;
			const d = new Date(t.date);
			if (d.getMonth() === cm && d.getFullYear() === cy) {
				if (t.type === 'income') monthIncome += t.amount;
				else monthExpense += t.amount;
			}
		}
		return {
			balance: totalIncome - totalExpense,
			totalIncome,
			totalExpense,
			monthIncome,
			monthExpense,
			transactionCount: txs.length,
			recentTransactions: txs.slice(0, 5)
		};
	});
</script>

<div class="space-y-3">
	<StaleIndicator />
	<div class="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Ringkasan keuangan">
		{#if app.transactionsLoading && app.transactions.length === 0}
			{#each [1, 2, 3, 4] as _}
				<Card padding="sm">
					<Skeleton height="h-3.5" class="w-1/2 mb-2" />
					<Skeleton height="h-7" class="w-3/4" />
				</Card>
			{/each}
		{:else}
			<Card padding="sm" class="group border-primary-100 bg-gradient-to-br from-white to-primary-50/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none dark:border-primary-900/50 dark:from-gray-900 dark:to-primary-950/20">
				<div class="flex items-start justify-between gap-2 p-1">
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">Saldo saat ini</p>
						<p class="mt-1.5 truncate text-sm font-bold tracking-tight tabular-nums min-[370px]:text-base sm:text-xl {summary.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
							{formatRupiah(summary.balance)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 sm:size-9 sm:rounded-xl sm:text-sm" aria-hidden="true">Rp</span>
				</div>
			</Card>
			<Card padding="sm" class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-2 p-1">
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">Pemasukan bulan ini</p>
						<p class="mt-1.5 truncate text-sm font-bold tracking-tight tabular-nums text-green-600 dark:text-green-400 min-[370px]:text-base sm:text-xl">
							{formatRupiah(summary.monthIncome)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-green-100 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300 sm:size-9 sm:rounded-xl sm:text-base" aria-hidden="true">↑</span>
				</div>
			</Card>
			<Card padding="sm" class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-2 p-1">
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">Pengeluaran bulan ini</p>
						<p class="mt-1.5 truncate text-sm font-bold tracking-tight tabular-nums text-red-600 dark:text-red-400 min-[370px]:text-base sm:text-xl">
							{formatRupiah(summary.monthExpense)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-red-100 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300 sm:size-9 sm:rounded-xl sm:text-base" aria-hidden="true">↓</span>
				</div>
			</Card>
			<Card padding="sm" class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-2 p-1">
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">Total transaksi</p>
						<p class="mt-1.5 truncate text-sm font-bold tracking-tight tabular-nums text-primary-600 dark:text-primary-400 min-[370px]:text-base sm:text-xl">
							{summary.transactionCount.toLocaleString('id-ID')}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 sm:size-9 sm:rounded-xl sm:text-sm" aria-hidden="true">#</span>
				</div>
			</Card>
		{/if}
	</div>
</div>
