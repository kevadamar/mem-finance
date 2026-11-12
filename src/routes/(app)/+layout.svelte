<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import StorageOwnershipBanner from '$lib/components/layout/StorageOwnershipBanner.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
	import { initSyncManager, stopSyncManager, subscribe, getPendingSyncCount, getNeedsAttentionCount, getIsOnline, syncPending, retryNeedsAttention } from '$lib/data/sync-manager';
	import { app, showToast, toggleMobileSidebar } from '$lib/state/app.svelte';
	import { setActiveUser } from '$lib/data/idb';
	import { resetRepos } from '$lib/data/repository-factory';

	let { data, children } = $props();
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let isDark = $state(false);
	let attentionCount = $state(0);
	let selectedUserId: string | null = null;
	let syncStarted = false;
	$effect.pre(() => {
		if (!browser) return;
		const nextUserId = data?.userId ?? null;
		if (selectedUserId === nextUserId) return;
		if (syncStarted) stopSyncManager();
		app.transactions = [];
		app.categories = [];
		app.budgets = [];
		resetRepos();
		setActiveUser(nextUserId);
		selectedUserId = nextUserId;
		if (syncStarted && nextUserId) void initSyncManager();
	});

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
		syncStarted = true;
		let lastAccountCheck = 0;
		async function checkAccountOnFocus() {
			if (!navigator.onLine || Date.now() - lastAccountCheck < 15000) return;
			lastAccountCheck = Date.now();
			try {
				const response = await fetch('/api/session', { cache: 'no-store' });
				const session = response.ok ? await response.json() as { userId: string } : null;
				if (response.status === 401 || (session && session.userId !== data.userId)) {
					app.transactions = [];
					app.categories = [];
					app.budgets = [];
					stopSyncManager();
					setActiveUser(null);
					window.location.reload();
				}
			} catch { /* Offline or temporarily unavailable: keep the current tab's account isolated. */ }
		}
		const onVisibility = () => { if (!document.hidden) void checkAccountOnFocus(); };
		window.addEventListener('focus', checkAccountOnFocus);
		document.addEventListener('visibilitychange', onVisibility);
		const onStorageStatusChanged = () => void invalidateAll();
		window.addEventListener('memfinance-storage-status-changed', onStorageStatusChanged);
		setActiveUser(data?.userId ?? null);
		(async () => {
			await initSyncManager();
			app.online = getIsOnline();
			app.pendingSync = getPendingSyncCount();
			attentionCount = getNeedsAttentionCount();
		})();

		const unsub = subscribe(() => {
			const wasOffline = !app.online;
			app.online = getIsOnline();
			app.pendingSync = getPendingSyncCount();
			attentionCount = getNeedsAttentionCount();

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
			syncStarted = false;
			window.removeEventListener('focus', checkAccountOnFocus);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('memfinance-storage-status-changed', onStorageStatusChanged);
			unsub();
			if (refreshTimer) clearInterval(refreshTimer);
			stopSyncManager();
			setActiveUser(null);
		};
	});
</script>

<div class="min-h-screen bg-[var(--canvas)]">
	{#if attentionCount > 0}
		<div class="border-b-[1.5px] border-[var(--border-strong)] bg-amber-50 px-4 py-2 font-mono text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-200" role="alert">
			[PERHATIAN] {attentionCount} perubahan belum tersimpan di server · Data tersimpan lokal.
			<button type="button" class="ml-2 underline font-bold" onclick={() => void retryNeedsAttention()}>Coba lagi</button>
		</div>
	{/if}
	{#if !app.online}
		<div class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border-[1.5px] border-[var(--border-strong)] bg-amber-100 px-3.5 py-1 text-center font-mono text-xs font-bold text-amber-950 shadow-[var(--shadow-retro-sm)] dark:bg-amber-950 dark:text-amber-100" role="status" transition:fade={{ duration: 160 }}>
			OFFLINE · data lokal tersedia
			{#if app.pendingSync > 0} · {app.pendingSync} antrean sync{/if}
		</div>
	{:else if app.pendingSync > 0}
		<div class="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border-[1.5px] border-[var(--border-strong)] bg-emerald-100 px-3.5 py-1 text-center font-mono text-xs font-bold text-emerald-950 shadow-[var(--shadow-retro-sm)] dark:bg-emerald-950 dark:text-emerald-100" role="status" transition:fade={{ duration: 160 }}>
			SYNC · {app.pendingSync} item menunggu sinkronisasi
		</div>
	{/if}

	<!-- Mobile & Tablet Header with Menu Hamburger button -->
	<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)]/95 px-4 backdrop-blur lg:hidden shadow-[0_2px_0_var(--shadow-retro-sm)]">
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={toggleMobileSidebar}
				class="retro-btn-push grid size-10 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-[var(--shadow-retro-sm)] hover:text-[var(--text-primary)]"
				aria-label="Buka menu navigasi"
			>
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
			<a href={resolve('/dashboard')} class="flex items-center gap-2 outline-none">
				<div class="grid size-8 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-primary)] text-white shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
					<svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
				</div>
				<span class="text-base font-black tracking-tight text-[var(--text-primary)]">MemFinance</span>
			</a>
		</div>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={toggleDark}
				class="retro-btn-push grid size-9 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-[var(--shadow-retro-sm)] hover:text-[var(--text-primary)]"
				aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
			>
				<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
			</button>
		</div>
	</header>

	<Sidebar />
	<div class="transition-[padding-left] duration-300 ease-in-out {app.sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}">
		<main class="mx-auto max-w-7xl p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-10">
			{#if data.personalStorageEnabled && data.storageStatus !== 'USER_OWNED_ADMIN_EDITOR'}
				<StorageOwnershipBanner status={data.storageStatus} googleConnected={data.googleConnected} connectedGoogleEmail={data.connectedGoogleEmail ?? undefined} targetEmail={data.googleOwnerEmail ?? undefined} />
			{/if}
			{#if !data.personalStorageEnabled || data.storageStatus === 'ADMIN_OWNED' || data.storageStatus === 'TRANSFER_PENDING' || data.storageStatus === 'USER_OWNED_ADMIN_EDITOR'}
				{@render children()}
			{/if}
		</main>
	</div>
	<BottomNav />
	<ToastContainer />
	<LoadingOverlay />
</div>
