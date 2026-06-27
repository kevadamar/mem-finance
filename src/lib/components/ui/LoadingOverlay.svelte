<script lang="ts">
	import { app } from '$lib/state/app.svelte';
</script>

{#if app.isMutating}
	<div class="fixed inset-0 z-[60] flex items-start justify-center pt-20 pointer-events-auto" style="background: rgba(0,0,0,0.15)">
		<div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3 border border-gray-200 dark:border-gray-700">
			<div class="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" role="status" aria-label="Memproses..."></div>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Menyimpan data...</span>
		</div>
	</div>
{/if}
