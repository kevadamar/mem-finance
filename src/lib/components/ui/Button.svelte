<script lang="ts">
	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: className = '',
		onclick,
		children
	}: {
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children: import('svelte').Snippet;
	} = $props();

	const baseClasses = 'inline-flex min-h-11 items-center justify-center rounded-xl font-bold tracking-tight border-[1.5px] border-[var(--border-strong)] transition-[background-color,color,border-color,box-shadow,transform] duration-100 ease-productive hover:-translate-x-[0.5px] hover:-translate-y-[0.5px] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none motion-reduce:transform-none motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0';

	const variantClasses: Record<Variant, string> = {
		primary: 'bg-primary-600 text-white shadow-[var(--shadow-retro-sm)] hover:bg-primary-700 hover:shadow-[var(--shadow-retro)] dark:bg-primary-500 dark:text-stone-950 dark:hover:bg-primary-400',
		secondary: 'bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-retro)]',
		ghost: 'border-transparent bg-transparent text-[var(--text-secondary)] shadow-none hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] hover:shadow-[var(--shadow-retro-sm)]',
		danger: 'bg-danger-600 text-white shadow-[var(--shadow-retro-sm)] hover:bg-danger-700 hover:shadow-[var(--shadow-retro)] dark:bg-danger-500 dark:text-white'
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'min-h-9 px-3 py-1.5 text-xs gap-1.5',
		md: 'min-h-11 px-4 py-2 text-sm gap-2',
		lg: 'min-h-12 px-5 py-3 text-base gap-2.5'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	aria-busy={loading}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}"
	{onclick}
>
	{#if loading}
		<svg class="animate-spin motion-reduce:animate-none h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
		</svg>
	{/if}
	{@render children()}
</button>
