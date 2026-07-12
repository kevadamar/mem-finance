<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
	import { initSyncManager, subscribe, getPendingSyncCount, getIsOnline, syncPending } from '$lib/data/sync-manager';
	import { app, showToast } from '$lib/state/app.svelte';

	let { data, children } = $props();
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

<div class="min-h-screen bg-[var(--canvas)]">
	{#if !app.online}
		<div class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border border-warning-500/25 bg-warning-50 px-3 py-1.5 text-center text-xs font-semibold text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-100" role="status" transition:fade={{ duration: 160 }}>
			Anda sedang offline · data tersimpan tetap tersedia
			{#if app.pendingSync > 0} — {app.pendingSync} item menunggu sync{/if}
		</div>
	{:else if app.pendingSync > 0}
		<div class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border border-primary-500/20 bg-primary-50 px-3 py-1.5 text-center text-xs font-semibold text-primary-800 shadow-sm dark:bg-primary-950 dark:text-primary-100" role="status" transition:fade={{ duration: 160 }}>
			{app.pendingSync} item menunggu sinkronisasi
		</div>
	{/if}

	<Sidebar />
	<div class="lg:pl-64">
		<main class="mx-auto max-w-7xl p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:p-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-10">
			{@render children()}
		</main>
	</div>
	<BottomNav />
	<ToastContainer />
	<LoadingOverlay />
</div>
