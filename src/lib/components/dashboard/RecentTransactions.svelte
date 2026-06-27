<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah, parseDate } from '$lib/utils/format';
</script>

<Card>
	{#snippet title()}
		<div class="flex items-center justify-between w-full">
			<span>Transaksi Terbaru</span>
			<a href="/transactions" class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">Lihat Semua</a>
		</div>
	{/snippet}

	{#if app.transactionsLoading && app.transactions.length === 0}
		<div class="space-y-3">
			{#each [1, 2, 3] as _}
				<div class="flex items-center gap-3">
					<Skeleton width="w-10" height="h-10" class="rounded-full" />
					<div class="flex-1"><Skeleton height="h-4" class="w-3/4 mb-1" /><Skeleton height="h-3" class="w-1/2" /></div>
					<Skeleton height="h-4" class="w-20" />
				</div>
			{/each}
		</div>
	{:else if app.transactions.length === 0}
		<EmptyState title="Belum ada transaksi" description="Yuk catat pengeluaran pertama kamu!" />
	{:else}
		<div class="space-y-3">
			{#each app.transactions.slice(0, 5) as t (t.id)}
				<div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
					<div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style="background-color: {t.type === 'expense' ? '#FEE2E2' : '#DCFCE7'}">
						<span style="color: {t.type === 'expense' ? '#DC2626' : '#16A34A'}">{t.type === 'expense' ? '↓' : '↑'}</span>
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{app.categories.find((c) => c.id === t.categoryId)?.name ?? 'Lainnya'}
							{#if t.id.startsWith('local_')}<span class="ml-1 text-[10px] text-amber-600">(belum sync)</span>{/if}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{t.note || parseDate(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
					</div>
					<p class="text-sm font-semibold {t.type === 'expense' ? 'text-red-600' : 'text-green-600'}">
						{t.type === 'expense' ? '-' : '+'}{formatRupiah(t.amount)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</Card>
