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

<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
	<div class="flex items-center justify-around h-16">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] {$page.url.pathname.startsWith(item.href)
					? 'text-primary-600 dark:text-primary-400'
					: 'text-gray-400 dark:text-gray-500'}"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
				</svg>
				<span class="text-[10px] font-medium">{item.short}</span>
			</a>
		{/each}
		<button onclick={toggleDark} class="flex flex-col items-center gap-1 px-2 py-1 min-w-[48px] text-gray-400 dark:text-gray-500" aria-label="Toggle dark mode">
			<span class="text-xl">{isDark ? '☀️' : '🌙'}</span>
			<span class="text-[10px] font-medium">{isDark ? 'Terang' : 'Gelap'}</span>
		</button>
	</div>
</nav>
