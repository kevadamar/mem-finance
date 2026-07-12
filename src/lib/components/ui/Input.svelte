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
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	} = $props();
</script>

<div class={className}>
	<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
		{label}{#if required}<span class="text-red-500">*</span>{/if}
		<input {type} {placeholder} {disabled} {required} {value} {oninput} {onchange}
			class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 text-sm transition-colors {error ? 'border-red-500 focus:ring-red-500' : ''}" />
	</label>
	{#if error}<p class="mt-1 text-xs text-red-500">{error}</p>{/if}
</div>
