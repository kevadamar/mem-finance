<script lang="ts">
	let {
		label,
		options,
		value,
		error = '',
		disabled = false,
		required = false,
		placeholder = 'Pilih...',
		class: className = '',
		id,
		hint = '',
		onchange
	}: {
		label: string;
		options: { value: string; label: string }[];
		value?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		placeholder?: string;
		class?: string;
		id?: string;
		hint?: string;
		onchange?: (e: Event) => void;
	} = $props();
</script>

<div class={className}>
	<label for={id} class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
		{label}{#if required}<span class="ml-1 text-danger-600 font-bold" aria-hidden="true">*</span><span class="sr-only"> wajib diisi</span>{/if}
	</label>
	{#if hint}<p id={id ? `${id}-hint` : undefined} class="mb-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>{/if}
	<select
		{id}
		{disabled}
		{required}
		{value}
		{onchange}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error && id ? `${id}-error` : hint && id ? `${id}-hint` : undefined}
		class="w-full min-h-11 pl-3.5 pr-10 rounded-xl border-[1.5px] bg-[var(--surface-1)] text-[var(--text-primary)] font-medium disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow,background-color] duration-100 {error ? 'border-danger-600 shadow-[var(--shadow-retro-sm)] ring-1 ring-danger-600/30' : 'border-[var(--border-strong)] shadow-[var(--shadow-retro-sm)] focus:outline-none focus:border-primary-600 focus:shadow-[var(--shadow-retro)]'}"
	>
		<option value="">{placeholder}</option>
		{#each options as opt (opt.value)}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if error}<p id={id ? `${id}-error` : undefined} class="mt-1.5 text-xs font-bold text-danger-600">{error}</p>{/if}
</div>
