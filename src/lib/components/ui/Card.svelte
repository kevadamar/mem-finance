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

<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden {className}">
	{#if title}
		<div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-900 dark:text-gray-100">
			{@render title()}
		</div>
	{/if}
	<div class={paddingClasses[padding]}>
		{@render children()}
	</div>
	{#if footer}
		<div class="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
			{@render footer()}
		</div>
	{/if}
</div>
