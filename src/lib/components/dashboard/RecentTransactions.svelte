<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah, parseDate } from '$lib/utils/format';
</script>

<Card>
	{#snippet title()}
		<div class="flex items-center justify-between gap-3 w-full">
			<div>
				<span class="text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--text-primary)]">Pita Transaksi Terkini</span>
				<p class="mt-0.5 text-xs text-[var(--text-secondary)]">5 catatan pembukuan terakhir Anda</p>
			</div>
			<a
				href={resolve('/transactions')}
				class="inline-flex items-center gap-1 shrink-0 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
			>
				Lihat Semua →
			</a>
		</div>
	{/snippet}

	{#if app.transactionsLoading && app.transactions.length === 0}
		<div class="space-y-3 p-1">
			{#each [1, 2, 3] as _ (_)}
				<div class="flex items-center gap-3">
					<Skeleton width="w-9" height="h-9" class="rounded-lg" />
					<div class="flex-1"><Skeleton height="h-4" class="w-3/4 mb-1" /><Skeleton height="h-3" class="w-1/2" /></div>
					<Skeleton height="h-4" class="w-20" />
				</div>
			{/each}
		</div>
	{:else if app.transactions.length === 0}
		<EmptyState
			title="Belum ada transaksi"
			description="Catat pengeluaran atau pemasukan pertama Anda di buku kas."
			actionLabel="Catat Transaksi"
			onaction={() => { if (typeof window !== 'undefined') window.location.href = '/transactions?new=1'; }}
		/>
	{:else}
		<div class="divide-y-[1.5px] divide-dashed divide-[var(--border-subtle)]">
			{#each app.transactions.slice(0, 5) as t (t.id)}
				{@const category = app.categories.find((c) => c.id === t.categoryId)}
				<a
					href={resolve('/transactions')}
					class="flex items-center gap-3 py-2.5 px-1 transition hover:bg-[var(--surface-2)]/60 rounded-lg group"
				>
					<div
						class="flex size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] font-mono text-sm font-bold shadow-[1px_1px_0px_var(--border-strong)] {t.type === 'expense' ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}"
					>
						<span>{t.type === 'expense' ? '↓' : '↑'}</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-1.5">
							{#if category?.color}
								<span class="inline-block size-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10" style="background-color: {category.color}"></span>
							{/if}
							<p class="truncate text-sm font-bold text-[var(--text-primary)]">
								{category?.name ?? 'Lainnya'}
								{#if t.id.startsWith('local_')}
									<span class="ml-1 font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">[offline]</span>
								{/if}
							</p>
						</div>
						<p class="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
							{t.note ? `${t.note} · ` : ''}{parseDate(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
						</p>
					</div>
					<p class="shrink-0 text-right font-mono text-sm font-bold {t.type === 'expense' ? 'text-danger-600 dark:text-danger-400' : 'text-emerald-700 dark:text-emerald-400'}">
						{t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}
					</p>
				</a>
			{/each}
		</div>
	{/if}
</Card>
