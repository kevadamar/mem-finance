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
			<Card padding="sm" class="col-span-2 sm:col-span-1 lg:col-span-1">
				<Skeleton height="h-3.5" class="w-1/2 mb-2" />
				<Skeleton height="h-7" class="w-3/4" />
			</Card>
			{#each [1, 2, 3] as _ (_)}
				<Card padding="sm">
					<Skeleton height="h-3.5" class="w-1/2 mb-2" />
					<Skeleton height="h-7" class="w-3/4" />
				</Card>
			{/each}
		{:else}
			<!-- Saldo Saat Ini (Layar Kalkulator Retro - Baris penuh di layar mobile) -->
			<Card padding="sm" class="col-span-2 sm:col-span-1 lg:col-span-1 border-[var(--border-strong)] bg-emerald-50/70 dark:bg-emerald-950/25">
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
							Sisa Saldo Kas
						</span>
						<p class="mt-1.5 font-mono text-base font-black tracking-tight tabular-nums min-[370px]:text-lg sm:text-xl break-words {summary.balance >= 0 ? 'text-[var(--income-fg)]' : 'text-[var(--expense-fg)]'}">
							{formatRupiah(summary.balance)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] font-mono text-xs font-black text-emerald-950 dark:text-emerald-100 sm:size-8 shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
						Rp
					</span>
				</div>
			</Card>

			<!-- Pemasukan Bulan Ini -->
			<Card padding="sm">
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Kas Masuk (Bulan Ini)
						</span>
						<p class="mt-1.5 font-mono text-sm font-bold tracking-tight tabular-nums text-[var(--income-fg)] min-[370px]:text-base sm:text-lg break-words">
							+{formatRupiah(summary.monthIncome)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-emerald-100/80 font-mono text-xs font-black text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 sm:size-8 shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
						↑
					</span>
				</div>
			</Card>

			<!-- Pengeluaran Bulan Ini -->
			<Card padding="sm">
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Kas Keluar (Bulan Ini)
						</span>
						<p class="mt-1.5 font-mono text-sm font-bold tracking-tight tabular-nums text-[var(--expense-fg)] min-[370px]:text-base sm:text-lg break-words">
							-{formatRupiah(summary.monthExpense)}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50 font-mono text-xs font-black text-danger-700 dark:bg-danger-950/60 dark:text-danger-300 sm:size-8 shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
						↓
					</span>
				</div>
			</Card>

			<!-- Total Transaksi -->
			<Card padding="sm" class="col-span-2 sm:col-span-1 lg:col-span-1">
				<div class="flex items-start justify-between gap-1.5 p-1">
					<div class="min-w-0 flex-1">
						<span class="block font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
							Total Catatan
						</span>
						<p class="mt-1.5 font-mono text-sm font-bold tracking-tight tabular-nums text-[var(--text-primary)] min-[370px]:text-base sm:text-lg break-words">
							{summary.transactionCount.toLocaleString('id-ID')}
						</p>
					</div>
					<span class="grid size-7 shrink-0 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] font-mono text-xs font-bold text-[var(--text-secondary)] sm:size-8 shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
						#
					</span>
				</div>
			</Card>
		{/if}
	</div>
</div>
