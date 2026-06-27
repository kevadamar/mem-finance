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
		onchange?: (e: Event) => void;
	} = $props();
</script>

<div class={className}>
	<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
		{label}{#if required}<span class="text-red-500">*</span>{/if}
		<select {disabled} {required} {value} {onchange}
			class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 text-sm transition-colors {error ? 'border-red-500 focus:ring-red-500' : ''}">
			<option value="">{placeholder}</option>
			{#each options as opt}<option value={opt.value}>{opt.label}</option>{/each}
		</select>
	</label>
	{#if error}<p class="mt-1 text-xs text-red-500">{error}</p>{/if}
</div>
