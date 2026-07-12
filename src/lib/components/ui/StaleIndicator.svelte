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
		} catch (err) {
			showToast('Gagal memperbarui data', 'error');
		} finally {
			app.transactionsLoading = false;
		}
	}
</script>

{#if app.transactionsStale}
	<div class="flex flex-wrap items-center gap-2 rounded-xl border border-warning-500/20 bg-warning-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200" role="status">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>
		<span>Data mungkin usang</span>
		<button onclick={refresh} disabled={app.transactionsLoading} class="ml-1 min-h-8 rounded-lg px-1 font-semibold underline underline-offset-2 hover:bg-warning-500/10 hover:no-underline">
			{app.transactionsLoading ? 'Memuat...' : 'Coba lagi'}
		</button>
	</div>
{/if}
