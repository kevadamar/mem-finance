<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { app } from '$lib/state/app.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { formatRupiah } from '$lib/utils/format';
	import { Chart } from 'svelte-echarts';
	import { init, use } from 'echarts/core';
	import { PieChart } from 'echarts/charts';
	import { TitleComponent, TooltipComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import type { EChartsOption } from 'echarts';

	use([PieChart, TitleComponent, TooltipComponent, CanvasRenderer]);

	let cm = $derived(new Date().getMonth() + 1);
	let cy = $derived(new Date().getFullYear());
	let prefersReducedMotion = $state(false);

	onMount(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => prefersReducedMotion = query.matches;
		sync();
		query.addEventListener('change', sync);
		return () => query.removeEventListener('change', sync);
	});

	let budgetData = $derived.by(() => {
		const budgets = app.budgets.filter((b) => Number(b.month) === cm && Number(b.year) === cy);
		if (budgets.length === 0) return null;
		const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
		const expenses = app.transactions.filter((t) => {
			if (t.type !== 'expense') return false;
			const d = new Date(t.date);
			return d.getMonth() + 1 === cm && d.getFullYear() === cy;
		});
		const budgetedCatIds = new Set(budgets.map((b) => b.categoryId));
		const totalSpent = expenses
			.filter((t) => budgetedCatIds.has(t.categoryId))
			.reduce((s, t) => s + t.amount, 0);
		const unbudgetedSpent = expenses
			.filter((t) => !budgetedCatIds.has(t.categoryId))
			.reduce((s, t) => s + t.amount, 0);
		return { totalBudget, totalSpent, unbudgetedSpent, remaining: totalBudget - totalSpent };
	});

	let chartOption = $derived.by((): EChartsOption | null => {
		if (!budgetData || budgetData.totalBudget === 0) return null;
		const budget = budgetData.totalBudget;
		const spent = budgetData.totalSpent;
		const capped = Math.min(spent, budget);
		const remaining = Math.max(budget - spent, 0);
		const overshoot = Math.max(spent - budget, 0);
		const data: Array<{ name: string; value: number; itemStyle: { color: string } }> = [];
		if (capped > 0) data.push({ name: 'Terpakai', value: capped, itemStyle: { color: '#EF4444' } });
		if (remaining > 0) data.push({ name: 'Sisa', value: remaining, itemStyle: { color: '#22C55E' } });
		if (data.length === 0) return null;
		return {
			animation: !prefersReducedMotion,
			animationDuration: 320,
			tooltip: { trigger: 'item', appendToBody: true, formatter: (p: { name: string; value: number; percent: number }) => `<strong>${p.name}</strong><br/>${formatRupiah(p.value)} (${p.percent}%)` },
			series: [{ type: 'pie', radius: ['55%', '80%'], center: ['50%', '50%'], avoidLabelOverlap: false, padAngle: 1, itemStyle: { borderColor: 'transparent', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' }, scaleSize: 6 }, data }]
		} as EChartsOption;
	});
</script>

<Card class="border-primary-100 dark:border-primary-900/50">
	{#if app.budgetsLoading && app.budgets.length === 0}
		<div class="flex h-48 items-center justify-center" aria-live="polite" aria-label="Memuat ringkasan budget"><div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-100 border-b-primary-600 motion-reduce:animate-none dark:border-primary-950"></div></div>
	{:else if !budgetData}
		<p class="text-lg font-semibold tracking-tight text-gray-950 dark:text-white mb-1">Ringkasan budget</p>
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">Tetapkan batas per kategori agar pengeluaran tetap terkendali.</p>
		<EmptyState title="Belum ada budget" description="Buat budget untuk bulan ini di halaman Budget" />
	{:else}
		<div transition:fade={{ duration: prefersReducedMotion ? 0 : 250 }}>
			<div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-lg font-semibold tracking-tight text-gray-950 dark:text-white">Ringkasan budget</p><p class="text-sm text-gray-500 dark:text-gray-400">Posisi budget untuk bulan berjalan.</p></div><a href="/budgets" class="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-400 sm:mt-0">Kelola budget</a></div>
			<div class="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
				<div class="w-48 h-48 shrink-0">{#if chartOption}<Chart {init} options={chartOption} />{/if}</div>
				<div class="grid w-full flex-1 grid-cols-1 gap-3 min-[460px]:grid-cols-3">
				<div class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/70 sm:text-left">
					<p class="text-xs text-gray-500 dark:text-gray-400">Total Budget</p>
					<p class="text-lg font-bold text-gray-900 dark:text-gray-100">{formatRupiah(budgetData.totalBudget)}</p>
				</div>
				<div class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/70 sm:text-left">
					<p class="text-xs text-gray-500 dark:text-gray-400">Terpakai</p>
					<p class="text-lg font-bold text-red-600">{formatRupiah(budgetData.totalSpent)}</p>
					{#if budgetData.unbudgetedSpent > 0}
						<p class="text-xs text-gray-400">+{formatRupiah(budgetData.unbudgetedSpent)} tanpa budget</p>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/70 sm:text-left">
					<p class="text-xs text-gray-500 dark:text-gray-400">Sisa</p>
					<p class="text-lg font-bold {budgetData.remaining >= 0 ? 'text-green-600' : 'text-orange-600'}">{formatRupiah(Math.abs(budgetData.remaining))}</p>
					<p class="text-xs text-gray-400">{budgetData.remaining >= 0 ? 'masih aman' : 'over budget'}</p>
				</div>
			</div>
		</div>
	</div>
	{/if}
</Card>
