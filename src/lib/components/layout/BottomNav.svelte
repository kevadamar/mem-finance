<script lang="ts">
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	import { navItems } from './nav-items';

	const primaryItems = navItems.filter((item) => ['/dashboard', '/transactions', '/budgets'].includes(item.href));
	const moreItems = navItems.filter((item) => ['/chat', '/categories', '/settings'].includes(item.href));
	let moreOpen = $state(false);
	let isDark = $state(false);

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

	function closeMore() {
		moreOpen = false;
	}
</script>

{#if moreOpen}
	<div class="lg:hidden fixed inset-0 z-40" role="presentation">
		<button class="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[1px]" aria-label="Tutup menu lainnya" onclick={closeMore} transition:fade={{ duration: 160 }}></button>
		<section id="more-menu" class="app-surface absolute inset-x-0 bottom-0 rounded-t-3xl border-t px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-float)]" aria-label="Menu lainnya" transition:fly={{ y: 24, duration: 220 }}>
			<div class="mx-auto mb-5 h-1.5 w-10 rounded-full bg-[var(--border-strong)]"></div>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<p class="text-base font-bold text-[var(--text-primary)]">Lainnya</p>
					<p class="mt-0.5 text-sm text-[var(--text-secondary)]">Atur cara MemFinance bekerja untuk Anda.</p>
				</div>
				<button class="grid size-11 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)]" onclick={closeMore} aria-label="Tutup menu">
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="grid grid-cols-3 gap-2">
				{#each moreItems as item}
					<a href={item.href} onclick={closeMore} class="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--surface-2)] px-2 text-center text-xs font-semibold text-[var(--text-secondary)] hover:text-primary-700 dark:hover:text-primary-300">
						<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
						<span>{item.label}</span>
					</a>
				{/each}
			</div>
			<div class="mt-3 grid grid-cols-2 gap-2">
				<button onclick={toggleDark} class="flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
					{isDark ? 'Mode terang' : 'Mode gelap'}
				</button>
				<form method="POST" action="/logout">
					<button type="submit" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger-500/25 text-sm font-semibold text-danger-500 hover:bg-danger-50 dark:hover:bg-rose-950">
						<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
						Keluar
					</button>
				</form>
			</div>
		</section>
	</div>
{/if}

<nav class="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] backdrop-blur-xl" aria-label="Navigasi utama">
	<div class="mx-auto grid h-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-lg grid-cols-5 items-start px-2 pt-2">
		{#each primaryItems.slice(0, 2) as item}
			<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 text-[10px] font-semibold {isActive(item.href) ? 'text-primary-700 dark:text-primary-300' : 'text-[var(--text-tertiary)]'}">
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
				<span>{item.short}</span>
			</a>
		{/each}
		<a href="/transactions" class="-mt-7 mx-auto grid size-14 place-items-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-700/25 transition-transform hover:-translate-y-0.5 active:scale-95" aria-label="Catat transaksi">
			<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M12 4v16m8-8H4" /></svg>
		</a>
		{#each primaryItems.slice(2) as item}
			<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 text-[10px] font-semibold {isActive(item.href) ? 'text-primary-700 dark:text-primary-300' : 'text-[var(--text-tertiary)]'}">
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
				<span>{item.short}</span>
			</a>
		{/each}
		<button onclick={() => moreOpen = !moreOpen} aria-expanded={moreOpen} aria-controls="more-menu" class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 text-[10px] font-semibold {moreOpen || moreItems.some((item) => isActive(item.href)) ? 'text-primary-700 dark:text-primary-300' : 'text-[var(--text-tertiary)]'}">
			<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0z" /></svg>
			<span>Lainnya</span>
		</button>
	</div>
</nav>
