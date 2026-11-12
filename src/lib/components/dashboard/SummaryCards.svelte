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
	<div class="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4 lg:gap-4" aria-label="Ringkasan buku kas">
		{#if app.transactionsLoading && app.transactions.length === 0}
			{#each [1, 2, 3, 4] as _ (_)}
				<Card padding="sm">
					<Skeleton height="h-3.5" class="w-1/2 mb-2" />
					<Skeleton height="h-7" class="w-3/4" />
				</Card>
			{/each}
		{:else}
			<!-- Saldo Saat Ini (Layar Kalkulator Retro) -->
			<Card padding="sm" interactive={true} class="border-emerald-800/40 bg-emerald-50/60 dark:border-emerald-600/40 dark:bg-emerald-950/20">
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
							Sisa Saldo
						</span>
						<p class="mt-1.5 truncate font-mono text-sm font-bold tracking-tight min-[370px]:text-base sm:text-xl {summary.balance >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-danger-600 dark:text-danger-500'}">
							{formatRupiah(summary.balance)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-emerald-800/40 bg-white font-mono text-xs font-bold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-900/50 dark:text-emerald-100 sm:size-8" aria-hidden="true">
						Rp
					</span>
				</div>
			</Card>

			<!-- Pemasukan Bulan Ini -->
			<Card padding="sm" interactive={true}>
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Kas Masuk (Bulan Ini)
						</span>
						<p class="mt-1.5 truncate font-mono text-sm font-bold tracking-tight text-emerald-700 dark:text-emerald-400 min-[370px]:text-base sm:text-xl">
							+{formatRupiah(summary.monthIncome)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-emerald-100/80 font-mono text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 sm:size-8" aria-hidden="true">
						↑
					</span>
				</div>
			</Card>

			<!-- Pengeluaran Bulan Ini -->
			<Card padding="sm" interactive={true}>
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Kas Keluar (Bulan Ini)
						</span>
						<p class="mt-1.5 truncate font-mono text-sm font-bold tracking-tight text-danger-600 dark:text-danger-500 min-[370px]:text-base sm:text-xl">
							-{formatRupiah(summary.monthExpense)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50 font-mono text-xs font-bold text-danger-700 dark:bg-danger-900/30 dark:text-danger-300 sm:size-8" aria-hidden="true">
						↓
					</span>
				</div>
			</Card>

			<!-- Total Transaksi -->
			<Card padding="sm" interactive={true}>
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Total Catatan
						</span>
						<p class="mt-1.5 truncate font-mono text-sm font-bold tracking-tight text-[var(--text-primary)] min-[370px]:text-base sm:text-xl">
							{summary.transactionCount.toLocaleString('id-ID')}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] font-mono text-xs font-bold text-[var(--text-secondary)] sm:size-8" aria-hidden="true">
						#
					</span>
				</div>
			</Card>
		{/if}
	</div>
</div>
