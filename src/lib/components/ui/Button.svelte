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

	const baseClasses = 'inline-flex min-h-11 items-center justify-center rounded-xl font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-productive active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

	const variantClasses: Record<Variant, string> = {
		primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400',
		secondary: 'border bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-2)]',
		ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
		danger: 'bg-danger-500 text-white shadow-sm hover:bg-rose-700'
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'min-h-9 px-3 py-1.5 text-sm gap-1.5',
		md: 'px-4 py-2.5 text-sm gap-2',
		lg: 'min-h-12 px-5 py-3 text-base gap-2'
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
		<svg class="animate-spin motion-reduce:animate-none h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	{/if}
	{@render children()}
</button>
