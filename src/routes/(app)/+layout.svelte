<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
	import { initSyncManager, subscribe, getPendingSyncCount, getIsOnline, syncPending } from '$lib/data/sync-manager';
	import { app, showToast } from '$lib/state/app.svelte';

	let { children } = $props();
	let refreshTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		(async () => {
			await initSyncManager();
			app.online = getIsOnline();
			app.pendingSync = getPendingSyncCount();
		})();

		const unsub = subscribe(() => {
			const wasOffline = !app.online;
			app.online = getIsOnline();
			app.pendingSync = getPendingSyncCount();

			if (wasOffline && app.online) {
				showToast('Koneksi tersambung kembali. Menyinkronkan data...', 'success');
				syncPending().then((result) => {
					if (result.succeeded > 0) {
						showToast(`${result.succeeded} item berhasil disinkronkan`, 'success');
					}
					window.dispatchEvent(new CustomEvent('memfinance-data-changed'));
				});
			}
		});

		refreshTimer = setInterval(() => {
			if (app.online && getPendingSyncCount() > 0) {
				syncPending();
			}
		}, 30000);

		return () => {
			unsub();
			if (refreshTimer) clearInterval(refreshTimer);
		};
	});
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-950">
	{#if !app.online}
		<div class="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 text-center text-xs py-1.5 font-medium" transition:slide>
			Anda sedang offline — menampilkan data tersimpan
			{#if app.pendingSync > 0} — {app.pendingSync} item menunggu sync{/if}
		</div>
	{:else if app.pendingSync > 0}
		<div class="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white text-center text-xs py-1.5 font-medium" transition:slide>
			{app.pendingSync} item menunggu sinkronisasi...
		</div>
	{/if}

	<Sidebar />
	<div class="lg:pl-64 {!app.online ? 'pt-7' : app.pendingSync > 0 ? 'pt-7' : ''}">
		<main class="pb-20 lg:pb-8 p-4 md:p-6 max-w-7xl mx-auto">
			{@render children()}
		</main>
	</div>
	<BottomNav />
	<ToastContainer />
	<LoadingOverlay />
</div>
