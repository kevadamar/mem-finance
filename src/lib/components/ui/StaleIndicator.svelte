<script lang="ts">
	import { app, showToast } from '$lib/state/app.svelte';
	import { getTransactionRepo } from '$lib/data/repository-factory';

	async function refresh() {
		app.transactionsLoading = true;
		try {
			const fresh = await getTransactionRepo().getAll();
			app.transactions = fresh;
			app.transactionsStale = false;
			showToast('Data diperbarui', 'success');
		} catch {
			showToast('Gagal memperbarui data', 'error');
		} finally {
			app.transactionsLoading = false;
		}
	}
</script>

{#if app.transactionsStale}
	<div class="flex flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-amber-700/60 dark:border-amber-600/60 bg-warning-50 dark:bg-amber-950/40 px-3.5 py-2 text-xs text-amber-900 dark:text-amber-200 shadow-[var(--shadow-retro-sm)]" role="status">
		<svg class="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
		<span class="font-bold">Mode Offline: Data lokal</span>
		<span class="text-amber-800/80 dark:text-amber-300/80">(mungkin belum tersinkron ke server)</span>
		<button onclick={refresh} disabled={app.transactionsLoading} class="ml-auto min-h-7 rounded-lg border-[1.5px] border-amber-800/40 px-2 py-0.5 font-bold uppercase tracking-wide text-xs hover:bg-amber-800/10 active:translate-y-0.5">
			{app.transactionsLoading ? 'Menyinkronkan...' : 'Sinkron Ulang'}
		</button>
	</div>
{/if}
