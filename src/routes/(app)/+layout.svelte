<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
	import { initSyncManager, subscribe, getPendingSyncCount, getIsOnline, syncPending } from '$lib/data/sync-manager';
	import { app, showToast, toggleMobileSidebar } from '$lib/state/app.svelte';

	let { data, children } = $props();
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let isDark = $state(false);

	$effect(() => {
		if (typeof document !== 'undefined') {
			isDark = document.documentElement.classList.contains('dark');
		}
		if (data?.user) {
			app.user = data.user;
		}
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		document.documentElement.classList.toggle('light', !isDark);
		localStorage.setItem('memfinance_dark_mode', String(isDark));
	}

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

	<!-- Mobile & Tablet Header with Menu Hamburger button -->
	<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-[var(--surface-1)]/95 px-4 backdrop-blur lg:hidden">
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={toggleMobileSidebar}
				class="grid size-10 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
				aria-label="Buka menu navigasi"
			>
				<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<a href="/dashboard" class="flex items-center gap-2 outline-none">
				<div class="grid size-8 place-items-center rounded-lg bg-primary-600 text-white shadow-xs" aria-hidden="true">
					<svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
				</div>
				<span class="text-base font-extrabold tracking-tight text-[var(--text-primary)]">MemFinance</span>
			</a>
		</div>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={toggleDark}
				class="grid size-9 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
				aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
			>
				<svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
			</button>
		</div>
	</header>

	<Sidebar />
	<div class="transition-[padding-left] duration-300 ease-in-out {app.sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}">
		<main class="mx-auto max-w-7xl p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-10">
			{@render children()}
		</main>
	</div>
	<BottomNav />
	<ToastContainer />
	<LoadingOverlay />
</div>
