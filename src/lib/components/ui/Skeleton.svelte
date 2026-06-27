<script lang="ts">
	let {
		width = 'w-full',
		height = 'h-4',
		class: className = ''
	}: {
		width?: string;
		height?: string;
		class?: string;
	} = $props();
</script>

<div class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded {width} {height} {className}" role="status" aria-label="Memuat..."></div>
