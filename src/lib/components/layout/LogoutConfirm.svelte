<script lang="ts">
	import { tick } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { getNeedsAttentionCount } from '$lib/data/sync-manager';

	let { open, oncancel, returnFocusTo }: { open: boolean; oncancel: () => void; returnFocusTo?: HTMLElement | null } = $props();
	let dialog: HTMLDialogElement;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	async function closeDialog() {
		oncancel();
		await tick();
		returnFocusTo?.focus();
	}

	function handleCancel(event: Event) {
		event.preventDefault();
		void closeDialog();
	}
</script>

<dialog bind:this={dialog} class="logout-dialog m-auto w-[calc(100%-2rem)] max-w-md overflow-visible bg-transparent p-0 text-left" aria-labelledby="logout-title" aria-describedby="logout-description" oncancel={handleCancel} onclick={(event) => event.target === dialog && closeDialog()}>
	<div class="logout-card relative overflow-hidden rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-retro)] sm:p-7">
		<div class="relative">
			<div class="mb-5 grid size-12 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50 text-danger-600 shadow-[var(--shadow-retro-sm)] dark:bg-rose-950/70">
				<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
			</div>
			<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-danger-700 dark:text-danger-400">
				<span class="inline-block size-1.5 rounded-full bg-danger-600"></span>
				Konfirmasi Keluar
			</div>
			<h2 id="logout-title" class="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">Keluar dari MemFinance?</h2>
			<p id="logout-description" class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
				Anda perlu masuk kembali untuk melihat dan mengelola data keuangan.
				{#if app.pendingSync > 0 || getNeedsAttentionCount() > 0}
					{app.pendingSync + getNeedsAttentionCount()} perubahan masih tersimpan di perangkat dan belum terkonfirmasi di server. Anda dapat mencoba sinkronisasi dulu atau tetap keluar; data ini tetap terpisah untuk akun Anda.
				{:else}
					Semua perubahan yang diketahui telah diproses.
				{/if}
			</p>
			<div class="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
				<button type="button" onclick={closeDialog} class="retro-btn-push min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] hover:bg-[var(--surface-1)] sm:min-w-28">Batal</button>
				<form method="POST" action="/logout" class="sm:min-w-28">
					<button type="submit" class="retro-btn-push flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-600 px-5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[var(--shadow-retro-sm)] hover:bg-danger-700">Keluar <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg></button>
				</form>
			</div>
		</div>
	</div>
</dialog>

<style>
	.logout-dialog[open] { animation: dialog-fade 180ms ease-out both; }
	.logout-dialog[open] .logout-card { animation: dialog-rise 280ms cubic-bezier(.2,.8,.2,1) both; }
	.logout-dialog::backdrop { background: rgb(3 12 18 / .55); backdrop-filter: blur(5px); animation: dialog-fade 180ms ease-out both; }
	@keyframes dialog-fade { from { opacity: 0; } }
	@keyframes dialog-rise { from { opacity: 0; transform: translateY(14px) scale(.98); } }
	@media (prefers-reduced-motion: reduce) { .logout-dialog[open], .logout-dialog[open] .logout-card, .logout-dialog::backdrop { animation-duration: 1ms; } }
</style>
