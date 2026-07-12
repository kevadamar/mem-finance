<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import StaleIndicator from '$lib/components/ui/StaleIndicator.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah } from '$lib/utils/format';

	let summary = $derived.by(() => {
		const txs = app.transactions;
		if (txs.length === 0) return null;
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
	<div class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-4" aria-label="Ringkasan keuangan">
		{#if app.transactionsLoading && app.transactions.length === 0}
			{#each [1, 2, 3, 4] as _}
				<Card>
					<Skeleton height="h-4" class="w-1/2 mb-2" />
					<Skeleton height="h-8" class="w-3/4" />
				</Card>
			{/each}
		{:else if summary}
			<Card class="group border-primary-100 bg-gradient-to-br from-white to-primary-50/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none dark:border-primary-900/50 dark:from-gray-900 dark:to-primary-950/20">
				<div class="flex items-start justify-between gap-3">
					<div><p class="text-sm font-medium text-gray-600 dark:text-gray-300">Saldo saat ini</p><p class="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl {summary.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">{formatRupiah(summary.balance)}</p></div>
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300" aria-hidden="true">Rp</span>
				</div>
			</Card>
			<Card class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-3"><div><p class="text-sm font-medium text-gray-600 dark:text-gray-300">Pemasukan bulan ini</p><p class="mt-2 break-words text-xl font-bold tracking-tight text-green-600 dark:text-green-400 sm:text-2xl">{formatRupiah(summary.monthIncome)}</p></div><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-green-100 text-lg font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300" aria-hidden="true">↑</span></div>
			</Card>
			<Card class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-3"><div><p class="text-sm font-medium text-gray-600 dark:text-gray-300">Pengeluaran bulan ini</p><p class="mt-2 break-words text-xl font-bold tracking-tight text-red-600 dark:text-red-400 sm:text-2xl">{formatRupiah(summary.monthExpense)}</p></div><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-100 text-lg font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300" aria-hidden="true">↓</span></div>
			</Card>
			<Card class="transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
				<div class="flex items-start justify-between gap-3"><div><p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total transaksi</p><p class="mt-2 text-xl font-bold tracking-tight text-primary-600 dark:text-primary-400 sm:text-2xl">{summary.transactionCount.toLocaleString('id-ID')}</p></div><span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300" aria-hidden="true">#</span></div>
			</Card>
		{/if}
	</div>
</div>
