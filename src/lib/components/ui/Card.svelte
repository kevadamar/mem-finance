<script lang="ts">
	let {
		padding = 'md',
		interactive = false,
		class: className = '',
		title,
		footer,
		children
	}: {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		interactive?: boolean;
		class?: string;
		title?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		children: import('svelte').Snippet;
	} = $props();

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-3 sm:p-3.5',
		md: 'p-4 sm:p-5',
		lg: 'p-6 sm:p-7'
	};
</script>

<div
	class="app-surface rounded-2xl border-[1.5px] border-[var(--border-strong)] shadow-[var(--shadow-card)] overflow-hidden {interactive ? 'transition-[transform,box-shadow] duration-120 ease-productive hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[var(--shadow-retro-lg)] motion-reduce:transform-none motion-reduce:transition-none' : ''} {className}"
>
	{#if title}
		<div class="px-4 py-3 sm:px-5 sm:py-3.5 border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] font-bold tracking-tight text-[var(--text-primary)]">
			{@render title()}
		</div>
	{/if}
	<div class={paddingClasses[padding]}>
		{@render children()}
	</div>
	{#if footer}
		<div class="px-4 py-3 sm:px-5 sm:py-3 border-t-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)]">
			{@render footer()}
		</div>
	{/if}
</div>
