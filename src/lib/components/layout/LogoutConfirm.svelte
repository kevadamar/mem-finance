<script lang="ts">
	import { tick } from 'svelte';

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
	<div class="logout-card app-surface relative overflow-hidden rounded-3xl border p-6 shadow-[var(--shadow-float)] sm:p-7">
		<div class="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-danger-500/10 blur-2xl" aria-hidden="true"></div>
		<div class="relative">
			<div class="mb-5 grid size-12 place-items-center rounded-2xl bg-danger-50 text-danger-500 ring-1 ring-danger-500/15 dark:bg-rose-950/70">
				<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
			</div>
			<h2 id="logout-title" class="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">Keluar dari MemFinance?</h2>
			<p id="logout-description" class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Anda perlu masuk kembali untuk melihat dan mengelola data keuangan. Pastikan semua perubahan sudah tersimpan.</p>
			<div class="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
				<button type="button" onclick={closeDialog} class="min-h-12 rounded-xl border px-5 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] active:scale-[0.98] sm:min-w-28">Tetap masuk</button>
				<form method="POST" action="/logout" class="sm:min-w-28">
					<button type="submit" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-danger-500 px-5 text-sm font-bold text-white shadow-md shadow-rose-900/15 transition hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 active:scale-[0.98]">Keluar <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0-5 5m5-5H6" /></svg></button>
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
