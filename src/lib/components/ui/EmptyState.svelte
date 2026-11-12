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
	<div class="mb-4 grid size-16 place-items-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--brand-text)] shadow-[var(--shadow-retro-sm)]"><svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d={icon} /></svg></div>
	<h3 class="text-lg font-black tracking-tight text-[var(--text-primary)]">{title}</h3>
	{#if description}<p class="mt-1 max-w-sm font-sans text-xs sm:text-sm leading-6 text-[var(--text-secondary)]">{description}</p>{/if}
	{#if actionLabel && onaction}
		<button onclick={onaction} class="retro-btn-push mt-5 inline-flex min-h-11 items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]">{actionLabel}</button>
	{/if}
</div>
