<script lang="ts">
	let {
		label,
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		error = '',
		disabled = false,
		required = false,
		class: className = '',
		id,
		hint = '',
		oninput,
		onchange
	}: {
		label: string;
		type?: 'text' | 'number' | 'date' | 'datetime-local' | 'password';
		placeholder?: string;
		value?: string | number;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		id?: string;
		hint?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	} = $props();
</script>

<div class={className}>
	<label for={id} class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
		{label}{#if required}<span class="ml-1 text-danger-600 font-bold" aria-hidden="true">*</span><span class="sr-only"> wajib diisi</span>{/if}
	</label>
	{#if hint}<p id={id ? `${id}-hint` : undefined} class="mb-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>{/if}
	<input
		{id}
		{type}
		{placeholder}
		{disabled}
		{required}
		bind:value
		{oninput}
		{onchange}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error && id ? `${id}-error` : hint && id ? `${id}-hint` : undefined}
		class="w-full min-h-11 px-3.5 rounded-xl border-[1.5px] bg-[var(--surface-1)] text-[var(--text-primary)] font-medium placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow,background-color] duration-100 {error ? 'border-danger-600 shadow-[var(--shadow-retro-sm)] ring-1 ring-danger-600/30' : 'border-[var(--border-strong)] shadow-[var(--shadow-retro-sm)] focus:outline-none focus:border-primary-600 focus:shadow-[var(--shadow-retro)]'}"
	/>
	{#if error}<p id={id ? `${id}-error` : undefined} class="mt-1.5 text-xs font-bold text-danger-600">{error}</p>{/if}
</div>
