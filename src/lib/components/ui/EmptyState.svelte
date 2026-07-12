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
	<div class="mb-4 grid size-16 place-items-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"><svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={icon} /></svg></div>
	<h3 class="text-lg font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
	{#if description}<p class="mt-1 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{description}</p>{/if}
	{#if actionLabel && onaction}
		<button onclick={onaction} class="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700">{actionLabel}</button>
	{/if}
</div>
