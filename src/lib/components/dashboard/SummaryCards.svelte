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
			recentTransactions: txs.slice(0, 5)
		};
	});
</script>

<div class="space-y-3">
	<StaleIndicator />
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		{#if app.transactionsLoading && app.transactions.length === 0}
			{#each [1, 2, 3, 4] as _}
				<Card>
					<Skeleton height="h-4" class="w-1/2 mb-2" />
					<Skeleton height="h-8" class="w-3/4" />
				</Card>
			{/each}
		{:else if summary}
			<Card>
				<p class="text-sm text-gray-500 dark:text-gray-400">Saldo Saat Ini</p>
				<p class="text-2xl font-bold {summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}">{formatRupiah(summary.balance)}</p>
			</Card>
			<Card>
				<p class="text-sm text-gray-500 dark:text-gray-400">Pemasukan Bulan Ini</p>
				<p class="text-2xl font-bold text-green-600">{formatRupiah(summary.monthIncome)}</p>
			</Card>
			<Card>
				<p class="text-sm text-gray-500 dark:text-gray-400">Pengeluaran Bulan Ini</p>
				<p class="text-2xl font-bold text-red-600">{formatRupiah(summary.monthExpense)}</p>
			</Card>
			<Card>
				<p class="text-sm text-gray-500 dark:text-gray-400">Total Transaksi</p>
				<p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{(summary.totalIncome + summary.totalExpense).toLocaleString('id-ID')}</p>
			</Card>
		{/if}
	</div>
</div>
