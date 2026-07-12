<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let {
		open = false,
		title,
		description,
		onclose,
		children
	}: {
		open: boolean;
		title?: string;
		description?: string;
		onclose?: () => void;
		children: import('svelte').Snippet;
	} = $props();

	let dialog = $state<HTMLDivElement>();
	let previousFocus: HTMLElement | null = null;
	const focusable = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

	$effect(() => {
		if (!open || typeof document === 'undefined') return;
		previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		tick().then(() => dialog?.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus() ?? dialog?.focus());
		return () => {
			document.body.style.overflow = originalOverflow;
			previousFocus?.focus();
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose?.();
			return;
		}
		if (e.key !== 'Tab') return;
		if (!dialog) return;
		const items = [...dialog.querySelectorAll<HTMLElement>(focusable)];
		if (!items.length) {
			e.preventDefault();
			dialog.focus();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="presentation">
		<button class="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]" onclick={() => onclose?.()} aria-label="Tutup dialog" transition:fade={{ duration: 150 }}></button>
		<div bind:this={dialog} tabindex="-1" class="app-surface relative z-10 max-h-[min(92dvh,48rem)] w-full overflow-y-auto rounded-t-3xl border shadow-[var(--shadow-float)] sm:max-w-lg sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby={title ? 'dialog-title' : undefined} aria-describedby={description ? 'dialog-description' : undefined} onkeydown={handleKeydown} transition:fly={{ y: 18, duration: 220 }}>
			{#if title}
				<div class="flex items-center justify-between gap-3 border-b px-5 py-4">
					<div>
						<h2 id="dialog-title" class="text-lg font-bold tracking-tight text-[var(--text-primary)]">{title}</h2>
						{#if description}<p id="dialog-description" class="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>{/if}
					</div>
					<button data-dialog-autofocus onclick={() => onclose?.()} class="-mr-2 grid size-10 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]" aria-label="Tutup">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>
			{/if}
			<div class="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
