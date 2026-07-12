<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah, parseDate } from '$lib/utils/format';
	import type { TransactionType } from '$lib/domain/entities/transaction';
	import { onMount } from 'svelte';
	import { Chart } from 'svelte-echarts';
	import { init, use } from 'echarts/core';
	import { PieChart } from 'echarts/charts';
	import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import type { EChartsOption } from 'echarts';

	use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

	let period = $state<'week' | 'month' | 'last-month' | '3months'>('month');
	let transactionType = $state<TransactionType>('expense');
	let prefersReducedMotion = $state(false);
	let isDesktop = $state(false);
	const periodLabels: Record<string, string> = { week: 'Minggu Ini', month: 'Bulan Ini', 'last-month': 'Bulan Lalu', '3months': '3 Bulan' };

	onMount(() => {
		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const desktopQuery = window.matchMedia('(min-width: 640px)');
		const sync = () => { prefersReducedMotion = motionQuery.matches; isDesktop = desktopQuery.matches; };
		sync();
		motionQuery.addEventListener('change', sync);
		desktopQuery.addEventListener('change', sync);
		return () => { motionQuery.removeEventListener('change', sync); desktopQuery.removeEventListener('change', sync); };
	});

	let chartOption = $derived.by((): EChartsOption | null => {
		const txs = app.transactions;
		const cats = app.categories;
		if (txs.length === 0) return null;

		const now = new Date();
		let start: Date, end: Date;
		switch (period) {
			case 'week': {
				const day = now.getDay();
				start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
				end = new Date(now); end.setHours(23, 59, 59, 999);
				break;
			}
			case 'last-month':
				start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				end = new Date(now.getFullYear(), now.getMonth(), 0);
				end.setHours(23, 59, 59, 999);
				break;
			case '3months':
				start = new Date(now.getFullYear(), now.getMonth() - 2, 1); start.setHours(0, 0, 0, 0);
				end = new Date(now); end.setHours(23, 59, 59, 999);
				break;
			default:
				start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0, 0, 0, 0);
				end = new Date(now); end.setHours(23, 59, 59, 999);
		}

		const filtered = txs.filter((t) => {
			if (t.type !== transactionType) return false;
			const d = parseDate(t.date);
			return d >= start && d <= end;
		});

		if (filtered.length === 0) return null;

		const grouped: Record<string, number> = {};
		for (const t of filtered) grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;

		const data = Object.entries(grouped)
			.map(([catId, amount]) => {
				const cat = cats.find((c) => c.id === catId);
				return { name: cat?.name ?? 'Lainnya', value: amount, itemStyle: { color: cat?.color ?? '#6B7280' } };
			})
			.sort((a, b) => b.value - a.value);

		return {
			animation: !prefersReducedMotion,
			animationDuration: 320,
			tooltip: { trigger: 'item', appendToBody: true, formatter: (p: { name: string; value: number; percent: number }) => `<strong>${p.name}</strong><br/>${formatRupiah(p.value)} (${p.percent}%)` },
			legend: isDesktop ? { orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 12, color: '#6B7280' }, type: 'scroll' } : { orient: 'horizontal', bottom: 0, left: 'center', textStyle: { fontSize: 11, color: '#6B7280' }, type: 'scroll' },
			series: [{ type: 'pie', radius: isDesktop ? ['45%', '75%'] : ['44%', '70%'], center: isDesktop ? ['40%', '50%'] : ['50%', '45%'], avoidLabelOverlap: false, padAngle: 1, itemStyle: { borderRadius: 5, borderColor: 'transparent', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 6 }, data }]
		} as EChartsOption;
	});

</script>

<Card>
	<div class="mb-4">
		<p class="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">Distribusi transaksi</p>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Lihat kategori yang paling banyak menyerap dana.</p>
	</div>
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
		<div class="inline-flex w-full rounded-xl bg-gray-100 p-1 dark:bg-gray-800 sm:w-auto" role="group" aria-label="Jenis transaksi">
			<button onclick={() => transactionType = 'expense'} aria-pressed={transactionType === 'expense'} class="min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 motion-reduce:transition-none {transactionType === 'expense' ? 'bg-white text-red-600 shadow-sm dark:bg-gray-700 dark:text-red-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}">Pengeluaran</button>
			<button onclick={() => transactionType = 'income'} aria-pressed={transactionType === 'income'} class="min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 motion-reduce:transition-none {transactionType === 'income' ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}">Pemasukan</button>
		</div>
		<label class="sr-only" for="chart-period">Periode grafik</label>
		<select id="chart-period" value={period} onchange={(e) => period = (e.target as HTMLSelectElement).value as typeof period} class="min-h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 sm:w-auto">
			{#each Object.entries(periodLabels) as [value, label]}<option {value}>{label}</option>{/each}
		</select>
	</div>

	{#if app.transactionsLoading}
		<div class="flex h-64 items-center justify-center" aria-live="polite" aria-label="Memuat distribusi transaksi"><div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-100 border-b-primary-600 motion-reduce:animate-none dark:border-primary-950"></div></div>
	{:else if !chartOption}
		<EmptyState title="Belum ada transaksi" description="Transaksi {transactionType === 'expense' ? 'pengeluaran' : 'pemasukan'} untuk periode ini belum ada." />
	{:else}
		<div class="h-80 sm:h-72 lg:h-80"><Chart {init} options={chartOption} /></div>
	{/if}
</Card>
