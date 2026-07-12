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

<div class="animate-pulse motion-reduce:animate-none rounded-xl bg-[var(--surface-2)] {width} {height} {className}" role="status" aria-label="Memuat..."><span class="sr-only">Memuat…</span></div>
