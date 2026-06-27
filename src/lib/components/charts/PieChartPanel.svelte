<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { app } from '$lib/state/app.svelte';
	import { formatRupiah, parseDate } from '$lib/utils/format';
	import type { TransactionType } from '$lib/domain/entities/transaction';
	import { Chart } from 'svelte-echarts';
	import { init, use } from 'echarts/core';
	import { PieChart } from 'echarts/charts';
	import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import type { EChartsOption } from 'echarts';

	use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

	let period = $state<'week' | 'month' | 'last-month' | '3months'>('month');
	let transactionType = $state<TransactionType>('expense');
	const periodLabels: Record<string, string> = { week: 'Minggu Ini', month: 'Bulan Ini', 'last-month': 'Bulan Lalu', '3months': '3 Bulan' };

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
			tooltip: { trigger: 'item', formatter: (p: { name: string; value: number; percent: number }) => `<strong>${p.name}</strong><br/>${formatRupiah(p.value)} (${p.percent}%)` },
			legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
			series: [{ type: 'pie', radius: ['45%', '75%'], center: ['40%', '50%'], avoidLabelOverlap: false, padAngle: 1, itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 8 }, data }]
		} as EChartsOption;
	});

</script>

<Card>
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
		<div class="flex items-center gap-2">
			<button onclick={() => transactionType = 'expense'} class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {transactionType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
			<button onclick={() => transactionType = 'income'} class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {transactionType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
		</div>
		<select value={period} onchange={(e) => period = (e.target as HTMLSelectElement).value as typeof period} class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
			{#each Object.entries(periodLabels) as [value, label]}<option {value}>{label}</option>{/each}
		</select>
	</div>

	{#if app.transactionsLoading}
		<div class="flex items-center justify-center h-64"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
	{:else if !chartOption}
		<EmptyState title="Belum ada transaksi" description="Transaksi {transactionType === 'expense' ? 'pengeluaran' : 'pemasukan'} untuk periode ini belum ada." />
	{:else}
		<div class="h-72 lg:h-80"><Chart {init} options={chartOption} /></div>
	{/if}
</Card>
