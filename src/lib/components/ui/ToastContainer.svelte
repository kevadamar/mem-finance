<script lang="ts">
	import { app } from '$lib/state/app.svelte';
</script>

{#if app.toast}
	<div class="fixed bottom-6 right-6 z-50 max-w-sm border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3 {app.toast.type === 'success' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400' : app.toast.type === 'error' ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400' : app.toast.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}" role="alert">
		<p class="text-sm font-medium">{app.toast.message}</p>
		<button onclick={() => app.toast = null} class="flex-shrink-0 opacity-70 hover:opacity-100" aria-label="Tutup">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
	</div>
{/if}
