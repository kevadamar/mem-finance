<script lang="ts">
	import { page } from '$app/stores';
	import { navItems } from './nav-items';

	let isDark = $state(false);
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
</script>

<aside class="app-surface hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r" aria-label="Navigasi utama">
	<div class="flex h-20 items-center gap-3 px-5">
		<div class="grid size-10 place-items-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-700/20" aria-hidden="true">
			<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16.5V8.8c0-.9.73-1.63 1.63-1.63.62 0 1.18.35 1.46.9L12 11.7l1.91-3.63a1.63 1.63 0 012.88.76v7.67M7 16.5h9.8M9.7 16.5v-2.1m4.6 2.1v-2.1" /></svg>
		</div>
		<div>
			<p class="text-base font-extrabold tracking-tight text-[var(--text-primary)]">MemFinance</p>
			<p class="text-xs text-[var(--text-secondary)]">Keuangan lebih tenang</p>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Menu aplikasi">
		<p class="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Ringkasan</p>
		<div class="space-y-1">
			{#each mainItems as item}
				<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}">
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
					{item.label}
				</a>
			{/each}
		</div>
		<p class="px-3 pb-2 pt-7 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Kelola</p>
		<div class="space-y-1">
			{#each secondaryItems as item}
				<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors {isActive(item.href) ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'}">
					<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
					{item.label}
				</a>
			{/each}
		</div>
	</nav>

	<div class="space-y-1 border-t p-3">
		<button onclick={toggleDark} class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]">
			<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
			{isDark ? 'Mode terang' : 'Mode gelap'}
		</button>
		<form method="POST" action="/logout">
			<button type="submit" class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger-500 transition-colors hover:bg-danger-50 dark:hover:bg-rose-950">
				<svg class="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
				Keluar
			</button>
		</form>
	</div>
</aside>
