<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { fade, fly } from 'svelte/transition';
	import { navItems } from './nav-items';
	import LogoutConfirm from './LogoutConfirm.svelte';
	import { theme } from '$lib/state/theme.svelte';

	const primaryItems = navItems.filter((item) => ['/dashboard', '/transactions', '/budgets'].includes(item.href));
	const moreItems = navItems.filter((item) => ['/chat', '/categories', '/settings'].includes(item.href));
	let moreOpen = $state(false);
	let logoutOpen = $state(false);
	let logoutTrigger = $state<HTMLButtonElement | null>(null);
	let moreTrigger = $state<HTMLButtonElement | null>(null);

	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname.startsWith(`${href}/`);
	}

	function closeMore() {
		moreOpen = false;
	}
</script>

{#if moreOpen}
	<div class="lg:hidden fixed inset-0 z-40" role="presentation">
		<button class="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]" aria-label="Tutup menu lainnya" onclick={closeMore} transition:fade={{ duration: 160 }}></button>
		<section id="more-menu" class="app-surface absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t-[2px] border-[var(--border-strong)] px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-float)]" aria-label="Menu lainnya" transition:fly={{ y: 24, duration: 220 }}>
			<div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--border-strong)]"></div>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<p class="font-mono text-base font-bold tracking-tight text-[var(--text-primary)]">Menu Lainnya</p>
					<p class="font-mono text-xs text-[var(--text-secondary)]">Kelola buku kas dan pengaturan</p>
				</div>
				<button class="grid size-9 place-items-center rounded-lg border-[1.5px] border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]" onclick={closeMore} aria-label="Tutup menu">
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="grid grid-cols-3 gap-2.5">
				{#each moreItems as item (item.href)}
					<a
						href={resolve(item.href)}
						onclick={closeMore}
						class="flex min-h-22 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-2 text-center font-mono text-xs font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition-all hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
					>
						<svg class="size-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
						<span>{item.label}</span>
					</a>
				{/each}
			</div>
			<div class="mt-3.5 grid grid-cols-2 gap-2.5">
				<button
					onclick={() => theme.toggleDark()}
					class="flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition-all hover:bg-[var(--surface-2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
				>
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={theme.isDark ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 10120.354 15.354z'} /></svg>
					{theme.isDark ? 'Mode Terang' : 'Mode Gelap'}
				</button>
				<button
					bind:this={logoutTrigger}
					type="button"
					onclick={() => { moreOpen = false; logoutOpen = true; }}
					class="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-danger-50 text-xs font-bold uppercase tracking-wider text-danger-700 shadow-[var(--shadow-retro-sm)] transition-all hover:bg-danger-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:bg-rose-950/40 dark:text-rose-200"
				>
					<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
					Keluar
				</button>
			</div>
		</section>
	</div>
{/if}

<nav class="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t-[2px] border-[var(--border-strong)] bg-[var(--surface-1)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" aria-label="Navigasi utama">
	<div class="mx-auto grid h-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-lg grid-cols-5 items-start px-2 pt-2">
		{#each primaryItems.slice(0, 2) as item (item.href)}
			<a
				href={resolve(item.href)}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 font-mono text-[10px] font-bold uppercase {isActive(item.href) ? 'text-[var(--brand-text)] font-extrabold' : 'text-[var(--text-secondary)]'}"
			>
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
				<span>{item.short}</span>
			</a>
		{/each}
		<a
			href={resolve('/transactions?new=1')}
			onclick={(e) => {
				if ($page.url.pathname === '/transactions') {
					e.preventDefault();
					window.dispatchEvent(new CustomEvent('memfinance-open-create-transaction'));
				}
			}}
			class="-mt-7 mx-auto grid size-14 place-items-center rounded-2xl border-[2px] border-[var(--border-strong)] bg-[var(--brand-fill)] text-[var(--on-brand)] shadow-[var(--shadow-retro)] transition-all hover:-translate-y-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
			aria-label="Catat transaksi baru"
		>
			<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
		</a>
		{#each primaryItems.slice(2) as item (item.href)}
			<a
				href={resolve(item.href)}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 font-mono text-[10px] font-bold uppercase {isActive(item.href) ? 'text-[var(--brand-text)] font-extrabold' : 'text-[var(--text-secondary)]'}"
			>
				<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} /></svg>
				<span>{item.short}</span>
			</a>
		{/each}
		<button
			bind:this={moreTrigger}
			onclick={() => moreOpen = !moreOpen}
			aria-expanded={moreOpen}
			aria-controls="more-menu"
			class="flex min-h-12 flex-col items-center gap-1 rounded-xl px-1 pt-1 font-mono text-[10px] font-bold uppercase {moreOpen || moreItems.some((item) => isActive(item.href)) ? 'text-[var(--brand-text)] font-extrabold' : 'text-[var(--text-secondary)]'}"
		>
			<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0z" /></svg>
			<span>Lainnya</span>
		</button>
	</div>
</nav>

<LogoutConfirm open={logoutOpen} oncancel={() => logoutOpen = false} returnFocusTo={logoutTrigger ?? moreTrigger} />
