<script lang="ts">
	let {
		value,
		max = 100,
		color,
		showLabel = false,
		class: className = ''
	}: {
		value: number;
		max?: number;
		color?: string;
		showLabel?: boolean;
		class?: string;
	} = $props();

	let pct = $derived(max > 0 ? Math.round((Math.min(Math.max(value, 0), max) / max) * 100) : 0);
	let barColor = $derived(color ?? (pct > 80 ? 'bg-danger-500' : pct > 50 ? 'bg-warning-500' : 'bg-success-500'));
</script>

<div class={className}>
	<div class="h-3 w-full overflow-hidden rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
		<div class="h-full rounded-full transition-[width] duration-500 ease-gentle motion-reduce:transition-none {barColor}" style="width: {pct}%" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max} aria-valuetext={`${pct}%`}></div>
	</div>
	{#if showLabel}<p class="mt-1 font-mono text-xs font-bold text-[var(--text-secondary)]">{pct}%</p>{/if}
</div>
