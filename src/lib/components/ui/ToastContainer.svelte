<script lang="ts">
	import { fly } from 'svelte/transition';
	import { app } from '$lib/state/app.svelte';
</script>

{#if app.toast}
	<div class="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:max-w-sm border-l-4 rounded-2xl shadow-[var(--shadow-float)] p-4 flex items-start gap-3 {app.toast.type === 'success' ? 'bg-success-50 border-success-500 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : app.toast.type === 'error' ? 'bg-danger-50 border-danger-500 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : app.toast.type === 'warning' ? 'bg-warning-50 border-warning-500 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-primary-50 border-primary-500 text-primary-800 dark:bg-primary-950 dark:text-primary-200'}" role="alert" transition:fly={{ x: 24, duration: 220 }}>
		<p class="text-sm font-medium flex-1">{app.toast.message}</p>
		<button onclick={() => app.toast = null} class="flex-shrink-0 opacity-70 hover:opacity-100" aria-label="Tutup">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
	</div>
{/if}
