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
	let barColor = $derived(color ?? (pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'));
</script>

<div class={className}>
	<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
		<div class="h-full rounded-full transition-all duration-700 ease-out {barColor}" style="width: {pct}%" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max}></div>
	</div>
	{#if showLabel}<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{pct}%</p>{/if}
</div>
