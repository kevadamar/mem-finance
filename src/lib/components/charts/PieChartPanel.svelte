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
	let isDark = $state(false);
	const periodLabels: Record<string, string> = { week: 'Minggu Ini', month: 'Bulan Ini', 'last-month': 'Bulan Lalu', '3months': '3 Bulan' };

	onMount(() => {
		const checkDark = () => {
			isDark = document.documentElement.classList.contains('dark');
		};
		checkDark();
		const observer = new MutationObserver(checkDark);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		const desktopQuery = window.matchMedia('(min-width: 640px)');
		const sync = () => { prefersReducedMotion = motionQuery.matches; isDesktop = desktopQuery.matches; };
		sync();
		motionQuery.addEventListener('change', sync);
		desktopQuery.addEventListener('change', sync);
		return () => {
			observer.disconnect();
			motionQuery.removeEventListener('change', sync);
			desktopQuery.removeEventListener('change', sync);
		};
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
					start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
					end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;
			}
			case 'last-month':
				start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
					end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
				break;
			case '3months':
					start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
					end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;
			default:
					start = new Date(now.getFullYear(), now.getMonth(), 1);
					end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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

		const legendColor = isDark ? '#b8c4be' : '#47564e';
		const tooltipBg = isDark ? '#1a1f1d' : '#fbf9f4';
		const tooltipBorder = isDark ? '#2f3b35' : '#1e2420';
		const tooltipText = isDark ? '#e5e7eb' : '#121514';

		return {
			animation: !prefersReducedMotion,
			animationDuration: 320,
			tooltip: {
				trigger: 'item',
				appendToBody: true,
				backgroundColor: tooltipBg,
				borderColor: tooltipBorder,
				borderWidth: 1.5,
				textStyle: { color: tooltipText, fontSize: 13, fontFamily: 'var(--font-mono)' },
				formatter: (p: { name: string; value: number; percent: number }) =>
					`<strong>${p.name}</strong><br/>${formatRupiah(p.value)} (${p.percent}%)`
			},
			legend: isDesktop
				? { orient: 'vertical', right: 8, top: 'center', textStyle: { fontSize: 12, color: legendColor, fontFamily: 'var(--font-sans)' }, type: 'scroll' }
				: { orient: 'horizontal', bottom: 0, left: 'center', textStyle: { fontSize: 11, color: legendColor, fontFamily: 'var(--font-sans)' }, type: 'scroll' },
			series: [
				{
					type: 'pie',
					radius: isDesktop ? ['45%', '75%'] : ['44%', '70%'],
					center: isDesktop ? ['40%', '50%'] : ['50%', '45%'],
					avoidLabelOverlap: false,
					padAngle: 1.5,
					itemStyle: { borderRadius: 4, borderColor: isDark ? '#121514' : '#fbf9f4', borderWidth: 2 },
					label: { show: false },
					emphasis: {
						label: { show: true, fontSize: 14, fontWeight: 'bold', color: isDark ? '#F9FAFB' : '#111827' },
						scaleSize: 6
					},
					data
				}
			]
		} as EChartsOption;
	});

</script>

<Card>
	<div class="mb-4">
		<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-primary)]">
			<span class="inline-block size-1.5 rounded-full bg-[var(--brand-primary)]"></span>
			Visualisasi
		</div>
		<p class="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">Distribusi Transaksi</p>
		<p class="mt-0.5 text-xs text-[var(--text-secondary)]">Kategori yang paling banyak menyerap dana.</p>
	</div>
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
		<div class="inline-flex w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-1 sm:w-auto shadow-[var(--shadow-retro-sm)]" role="group" aria-label="Jenis transaksi">
			<button
				onclick={() => transactionType = 'expense'}
				aria-pressed={transactionType === 'expense'}
				class="min-h-9 flex-1 rounded-[6px] px-3 font-mono text-xs font-bold uppercase tracking-wider transition {transactionType === 'expense' ? 'border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-danger-700 shadow-[1px_1px_0_var(--shadow-retro)] dark:text-danger-300' : 'border-[1.5px] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				Pengeluaran
			</button>
			<button
				onclick={() => transactionType = 'income'}
				aria-pressed={transactionType === 'income'}
				class="min-h-9 flex-1 rounded-[6px] px-3 font-mono text-xs font-bold uppercase tracking-wider transition {transactionType === 'income' ? 'border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-emerald-800 shadow-[1px_1px_0_var(--shadow-retro)] dark:text-emerald-300' : 'border-[1.5px] border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				Pemasukan
			</button>
		</div>
		<label class="sr-only" for="chart-period">Periode grafik</label>
		<select
			id="chart-period"
			value={period}
			onchange={(e) => period = (e.target as HTMLSelectElement).value as typeof period}
			class="min-h-10 w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] pl-3.5 pr-10 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none sm:w-auto"
		>
			{#each Object.entries(periodLabels) as [value, label] (value)}<option {value}>{label}</option>{/each}
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
