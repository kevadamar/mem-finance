<script lang="ts">
	import { fade } from 'svelte/transition';
	import { app } from '$lib/state/app.svelte';
</script>

{#if app.isMutating}
	<div class="fixed inset-0 z-[60] flex items-start justify-center bg-black/15 px-4 pt-[max(5rem,env(safe-area-inset-top))] pointer-events-auto" transition:fade={{ duration: 150 }} aria-live="assertive">
		<div class="app-surface flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-[var(--shadow-float)]">
			<div class="size-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-primary-600 border-t-transparent" role="status" aria-label="Memproses..."></div>
			<span class="text-sm font-semibold text-[var(--text-primary)]">Menyimpan data...</span>
		</div>
	</div>
{/if}
