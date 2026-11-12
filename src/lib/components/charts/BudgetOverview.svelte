<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/ui/Card.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
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
		<div class="flex items-center justify-between gap-2 mb-1">
			<p class="text-base font-bold tracking-tight text-gray-950 dark:text-white sm:text-lg">Ringkasan budget</p>
		</div>
		<p class="mb-2 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Tetapkan batas per kategori agar pengeluaran tetap terkendali.</p>
		<EmptyState title="Belum ada budget" description="Buat budget bulan ini untuk mengontrol pengeluaran" actionLabel="Atur Budget Sekarang" onaction={() => window.location.href = '/budgets'} />
	{:else}
		<div transition:fade={{ duration: prefersReducedMotion ? 0 : 250 }}>
			<div class="mb-4 flex items-center justify-between gap-2">
				<div>
					<p class="text-base font-bold tracking-tight text-gray-950 dark:text-white sm:text-lg">Ringkasan budget</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">Posisi budget bulan berjalan.</p>
				</div>
				<a
					href={resolve('/budgets')}
					class="inline-flex items-center gap-1 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
				>
					Kelola Anggaran →
				</a>
			</div>
			<div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
				<div class="h-44 w-44 shrink-0 sm:h-48 sm:w-48">{#if chartOption}<Chart {init} options={chartOption} />{/if}</div>
				<div class="grid w-full flex-1 grid-cols-3 gap-2 sm:gap-3">
					<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-2.5 text-center shadow-[var(--shadow-retro-sm)] sm:p-3 sm:text-left">
						<p class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] sm:text-xs">Batas Total</p>
						<p class="mt-1 truncate font-mono text-xs font-bold text-[var(--text-primary)] sm:text-base">{formatRupiah(budgetData.totalBudget)}</p>
					</div>
					<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-2.5 text-center shadow-[var(--shadow-retro-sm)] sm:p-3 sm:text-left">
						<p class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] sm:text-xs">Terpakai</p>
						<p class="mt-1 truncate font-mono text-xs font-bold text-danger-600 dark:text-danger-400 sm:text-base">{formatRupiah(budgetData.totalSpent)}</p>
						{#if budgetData.unbudgetedSpent > 0}
							<p class="mt-0.5 hidden truncate font-mono text-[9px] text-[var(--text-tertiary)] sm:block">+{formatRupiah(budgetData.unbudgetedSpent)} luar alokasi</p>
						{/if}
					</div>
					<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-2.5 text-center shadow-[var(--shadow-retro-sm)] sm:p-3 sm:text-left">
						<p class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] sm:text-xs">Sisa Kuota</p>
						<p class="mt-1 truncate font-mono text-xs font-bold sm:text-base {budgetData.remaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-danger-600 dark:text-danger-400'}">{formatRupiah(Math.abs(budgetData.remaining))}</p>
						<span class="mt-0.5 inline-block font-mono text-[10px] font-bold uppercase {budgetData.remaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-danger-600 dark:text-danger-400'}">[{budgetData.remaining >= 0 ? 'AMAN' : 'OVER'}]</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</Card>
