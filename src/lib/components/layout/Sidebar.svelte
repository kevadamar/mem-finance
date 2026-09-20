<script lang="ts">
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	import { navItems } from './nav-items';
	import LogoutConfirm from './LogoutConfirm.svelte';
	import { app, toggleSidebarCollapsed, closeMobileSidebar } from '$lib/state/app.svelte';

	let isDark = $state(false);
	let logoutOpen = $state(false);
	let logoutTrigger = $state<HTMLButtonElement | null>(null);
	const mainItems = navItems.filter((item) => ['/dashboard', '/transactions', '/budgets'].includes(item.href));
	const secondaryItems = navItems.filter((item) => ['/chat', '/categories', '/settings'].includes(item.href));

	$effect(() => {
		isDark = document.documentElement.classList.contains('dark');
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		document.documentElement.classList.toggle('light', !isDark);
		localStorage.setItem('memfinance_dark_mode', String(isDark));
	}

	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname.startsWith(`${href}/`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && app.mobileSidebarOpen) {
			closeMobileSidebar();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Desktop Sidebar (Collapsible: w-64 <-> w-20) -->
<aside
	class="app-surface hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col lg:border-r transition-[width] duration-300 ease-in-out {app.sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}"
	aria-label="Navigasi utama"
>
	<!-- Header -->
	<div class="flex h-20 items-center {app.sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'}">
		{#if app.sidebarCollapsed}
			<div class="flex flex-col items-center gap-1.5">
				<div class="grid size-10 place-items-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-700/20" aria-hidden="true">
					<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
				</div>
				<button
					type="button"
					onclick={toggleSidebarCollapsed}
					class="grid size-7 place-items-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
					title="Perluas menu (expand)"
					aria-label="Perluas sidebar"
				>
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<div class="grid size-10 place-items-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-700/20" aria-hidden="true">
					<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
				</div>
				<div>
					<p class="text-base font-extrabold tracking-tight text-[var(--text-primary)]">MemFinance</p>
					<p class="text-xs text-[var(--text-secondary)]">Keuangan lebih tenang</p>
				</div>
			</div>
			<button
				type="button"
				onclick={toggleSidebarCollapsed}
				class="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
				title="Ciutkan menu (collapse)"
				aria-label="Ciutkan sidebar"
			>
				<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
			</button>
		{/if}
	</div>

	<!-- Navigation items -->
	<nav class="flex-1 overflow-y-auto {app.sidebarCollapsed ? 'px-2' : 'px-3'} pb-4" aria-label="Menu aplikasi">
		{#if !app.sidebarCollapsed}
			<p class="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Ringkasan</p>
		{:else}
			<div class="my-2 border-t border-[var(--border-subtle)]"></div>
		{/if}
		<div class="space-y-1">
			{#each mainItems as item}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					title={item.label}
					class="flex min-h-11 items-center {app.sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-xl text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}"
				>
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
					{#if !app.sidebarCollapsed}
						<span>{item.label}</span>
					{/if}
				</a>
			{/each}
		</div>

		{#if !app.sidebarCollapsed}
			<p class="px-3 pb-2 pt-7 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Kelola</p>
		{:else}
			<div class="my-3 border-t border-[var(--border-subtle)]"></div>
		{/if}
		<div class="space-y-1">
			{#each secondaryItems as item}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					title={item.label}
					class="flex min-h-11 items-center {app.sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-xl text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}"
				>
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
					{#if !app.sidebarCollapsed}
						<span>{item.label}</span>
					{/if}
				</a>
			{/each}
		</div>
	</nav>

	<!-- Footer -->
	<div class="space-y-1 border-t {app.sidebarCollapsed ? 'p-2' : 'p-3'}">
		{#if app.user}
			<div class="mb-1 flex items-center {app.sidebarCollapsed ? 'justify-center px-0 py-1' : 'gap-2.5 px-2.5 py-2'} rounded-xl bg-[var(--surface-2)]/60">
				{#if app.user.user_metadata?.avatar_url}
					<img
						src={app.user.user_metadata.avatar_url}
						alt={app.user.user_metadata.name || 'User'}
						class="size-8 shrink-0 rounded-full ring-2 ring-primary-500/20 object-cover"
						title="{app.user.user_metadata.name || app.user.email} ({app.user.email})"
					/>
				{:else}
					<div class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
						{(app.user.user_metadata?.name || app.user.email || 'U').charAt(0).toUpperCase()}
					</div>
				{/if}
				{#if !app.sidebarCollapsed}
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-bold text-[var(--text-primary)]">{app.user.user_metadata?.name || 'Pengguna'}</p>
						<p class="truncate text-[10px] text-[var(--text-secondary)]">{app.user.email}</p>
					</div>
				{/if}
			</div>
		{/if}
		<button
			onclick={toggleDark}
			title={isDark ? 'Mode terang' : 'Mode gelap'}
			aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
			class="flex min-h-11 w-full items-center {app.sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-xl text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
		>
			<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
			{#if !app.sidebarCollapsed}
				<span>{isDark ? 'Mode terang' : 'Mode gelap'}</span>
			{/if}
		</button>
		<button
			bind:this={logoutTrigger}
			type="button"
			onclick={() => logoutOpen = true}
			title="Keluar"
			aria-label="Keluar dari akun"
			class="flex min-h-11 w-full items-center {app.sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-xl text-sm font-semibold text-danger-500 transition-colors hover:bg-danger-50 dark:hover:bg-rose-950"
		>
			<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
			{#if !app.sidebarCollapsed}
				<span>Keluar</span>
			{/if}
		</button>
	</div>
</aside>

<!-- Mobile & Tablet Off-Canvas Drawer (Slides in when mobileSidebarOpen is true) -->
{#if app.mobileSidebarOpen}
	<div class="fixed inset-0 z-50 lg:hidden" role="presentation">
		<button
			class="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
			aria-label="Tutup menu navigasi"
			onclick={closeMobileSidebar}
			transition:fade={{ duration: 180 }}
		></button>
		<div
			class="app-surface absolute inset-y-0 left-0 z-10 flex w-72 max-w-[85vw] flex-col border-r shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Navigasi drawer"
			transition:fly={{ x: -280, duration: 250 }}
		>
			<div class="flex h-16 items-center justify-between border-b px-4">
				<div class="flex items-center gap-3">
					<div class="grid size-9 place-items-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-700/20" aria-hidden="true">
						<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
					</div>
					<div>
						<p class="text-base font-extrabold tracking-tight text-[var(--text-primary)]">MemFinance</p>
						<p class="text-xs text-[var(--text-secondary)]">Keuangan lebih tenang</p>
					</div>
				</div>
				<button
					onclick={closeMobileSidebar}
					class="grid size-10 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
					aria-label="Tutup menu navigasi"
				>
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu aplikasi mobile">
				<p class="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Ringkasan</p>
				<div class="space-y-1">
					{#each mainItems as item}
						<a
							href={item.href}
							onclick={closeMobileSidebar}
							aria-current={isActive(item.href) ? 'page' : undefined}
							class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}"
						>
							<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
							{item.label}
						</a>
					{/each}
				</div>

				<p class="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Kelola</p>
				<div class="space-y-1">
					{#each secondaryItems as item}
						<a
							href={item.href}
							onclick={closeMobileSidebar}
							aria-current={isActive(item.href) ? 'page' : undefined}
							class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}"
						>
							<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
							{item.label}
						</a>
					{/each}
				</div>
			</nav>

			<div class="space-y-1 border-t p-3">
				{#if app.user}
					<div class="mb-2 flex items-center gap-3 rounded-xl bg-[var(--surface-2)]/60 p-2.5">
						{#if app.user.user_metadata?.avatar_url}
							<img
								src={app.user.user_metadata.avatar_url}
								alt={app.user.user_metadata.name || 'User'}
								class="size-9 shrink-0 rounded-full ring-2 ring-primary-500/20 object-cover"
							/>
						{:else}
							<div class="grid size-9 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
								{(app.user.user_metadata?.name || app.user.email || 'U').charAt(0).toUpperCase()}
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-bold text-[var(--text-primary)]">{app.user.user_metadata?.name || 'Pengguna'}</p>
							<p class="truncate text-[10px] text-[var(--text-secondary)]">{app.user.email}</p>
						</div>
					</div>
				{/if}
				<button onclick={toggleDark} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]">
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
					{isDark ? 'Mode terang' : 'Mode gelap'}
				</button>
				<button bind:this={logoutTrigger} type="button" onclick={() => { closeMobileSidebar(); logoutOpen = true; }} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger-500 transition-colors hover:bg-danger-50 dark:hover:bg-rose-950">
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
					Keluar
				</button>
			</div>
		</div>
	</div>
{/if}

<LogoutConfirm open={logoutOpen} oncancel={() => logoutOpen = false} returnFocusTo={logoutTrigger} />
