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
	<div class="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
		<div class="h-full rounded-full transition-[width] duration-500 ease-gentle motion-reduce:transition-none {barColor}" style="width: {pct}%" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max} aria-valuetext={`${pct}%`}></div>
	</div>
	{#if showLabel}<p class="mt-1 text-xs text-[var(--text-secondary)]">{pct}%</p>{/if}
</div>
