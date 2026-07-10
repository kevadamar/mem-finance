<script lang="ts">
	import { page } from '$app/stores';
import { navItems } from './nav-items';

let isDark = $state(false);
$effect(() => { isDark = document.documentElement.classList.contains('dark'); });

function toggleDark() {
	isDark = !isDark;
	document.documentElement.classList.toggle('dark', isDark);
	document.documentElement.classList.toggle('light', !isDark);
	localStorage.setItem('memfinance_dark_mode', String(isDark));
}
</script>

<aside class="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30">
	<div class="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-800">
		<span class="text-xl font-bold text-primary-600 dark:text-primary-400">MemFinance</span>
	</div>
	<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {$page.url.pathname.startsWith(item.href)
					? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
					: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
			>
				<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
				</svg>
				{item.label}
			</a>
		{/each}
	</nav>
	<div class="border-t border-gray-200 dark:border-gray-800 px-3 py-3">
		<button onclick={toggleDark}
			class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
			<span class="text-lg">{isDark ? '☀️' : '🌙'}</span>
			{isDark ? 'Mode Terang' : 'Mode Gelap'}
		</button>
	</div>
	<div class="border-t border-gray-200 dark:border-gray-800 px-3 py-3">
		<form method="POST" action="/logout" class="w-full">
			<button type="submit" class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
				Keluar
			</button>
		</form>
	</div>
</aside>
