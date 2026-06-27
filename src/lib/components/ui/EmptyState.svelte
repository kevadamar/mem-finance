<script lang="ts">
	let {
		icon = 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
		title,
		description,
		actionLabel,
		onaction,
		class: className = ''
	}: {
		icon?: string;
		title: string;
		description?: string;
		actionLabel?: string;
		onaction?: () => void;
		class?: string;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center {className}">
	<svg class="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={icon} /></svg>
	<h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
	{#if description}<p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>{/if}
	{#if actionLabel && onaction}
		<button onclick={onaction} class="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">{actionLabel}</button>
	{/if}
</div>
