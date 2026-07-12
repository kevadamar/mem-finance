<script lang="ts">
	let {
		label,
		type = 'text',
		placeholder = '',
		value = '',
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
	<label for={id} class="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
		{label}{#if required}<span class="ml-0.5 text-danger-500" aria-hidden="true">*</span><span class="sr-only"> wajib diisi</span>{/if}
	</label>
	{#if hint}<p id={id ? `${id}-hint` : undefined} class="mb-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>{/if}
	<input {id} {type} {placeholder} {disabled} {required} {value} {oninput} {onchange}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error && id ? `${id}-error` : hint && id ? `${id}-hint` : undefined}
		class="w-full min-h-11 px-3 rounded-xl border bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:opacity-55 transition-[border-color,box-shadow,background-color] {error ? 'border-danger-500' : 'hover:border-[var(--border-strong)]'}" />
	{#if error}<p id={id ? `${id}-error` : undefined} class="mt-1.5 text-xs font-medium text-danger-500">{error}</p>{/if}
</div>
