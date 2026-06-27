<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	let {
		open = false,
		title,
		onclose,
		children
	}: {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children: import('svelte').Snippet;
	} = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
		<button class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick={handleBackdropClick} aria-label="Tutup" transition:fade={{ duration: 150 }}></button>
		<div class="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden" transition:scale={{ start: 0.95, duration: 200 }}>
			{#if title}
				<div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
					<button onclick={() => onclose?.()} class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800" aria-label="Tutup">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>
			{/if}
			<div class="p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
