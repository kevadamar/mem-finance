<script lang="ts">
	let {
		padding = 'md',
		class: className = '',
		title,
		footer,
		children
	}: {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		title?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		children: import('svelte').Snippet;
	} = $props();

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-3',
		md: 'p-5',
		lg: 'p-7'
	};
</script>

<div class="app-surface rounded-2xl border shadow-[var(--shadow-card)] overflow-hidden {className}">
	{#if title}
		<div class="px-5 py-4 border-b font-semibold text-[var(--text-primary)]">
			{@render title()}
		</div>
	{/if}
	<div class={paddingClasses[padding]}>
		{@render children()}
	</div>
	{#if footer}
		<div class="px-5 py-3 border-t bg-[var(--surface-2)]">
			{@render footer()}
		</div>
	{/if}
</div>
