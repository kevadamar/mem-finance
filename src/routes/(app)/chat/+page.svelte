<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { getTransactionRepo, getCategoryRepo } from '$lib/data/repository-factory';
	import { CreateTransactionUseCase } from '$lib/domain/usecases/create-transaction.usecase';
	import { withMutation, showToast } from '$lib/state/app.svelte';
	import { formatRupiah } from '$lib/utils/format';
	import type { ParsedTransaction, ChatMessage, ParserResult } from '$lib/domain/entities/chat';
	import type { Category } from '$lib/domain/entities/category';
	import Button from '$lib/components/ui/Button.svelte';

	let messages = $state<ChatMessage[]>([]);
	let input = $state('');
	let loading = $state(false);
	let categories = $state<Category[]>([]);
	let messagesContainer: HTMLDivElement | undefined = $state(undefined);
	let hasScrolledUp = $state(false);

	onMount(async () => {
		categories = await getCategoryRepo().getAll();
		messages = [{
			id: 'welcome',
			role: 'assistant',
			content: 'Halo! Saya bisa bantu mencatat transaksi kamu.\n\nContoh:\n• "Beli kopi 35rb"\n• "Makan siang 25rb di warteg"\n• "Gaji bulan ini 5jt"\n• "Bayar listrik 250rb"',
			timestamp: new Date().toISOString()
		}];
		await tick();
		scrollToBottom();
	});

	function scrollToBottom() {
		if (!messagesContainer) return;
		const el = messagesContainer;
		if (!hasScrolledUp) {
			requestAnimationFrame(() => {
				el.scrollTop = el.scrollHeight;
			});
		}
	}

	function onScroll() {
		if (!messagesContainer) return;
		const el = messagesContainer;
		hasScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
	}

	function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
		const newMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
		messages = [...messages, newMsg];
		return newMsg;
	}

	async function sendMessage() {
		const text = input.trim();
		if (!text || loading) return;

		input = '';
		addMessage({ role: 'user', content: text });
		loading = true;
		await tick();
		scrollToBottom();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: text })
			});
			const result: ParserResult = await res.json();

			if (result.data) {
				addMessage({
					role: 'assistant',
					content: result.message || `Saya tangkap: ${result.data.type === 'expense' ? '🔴 Pengeluaran' : '🟢 Pemasukan'} Rp ${result.data.amount.toLocaleString('id-ID')} untuk ${result.data.category}. Konfirmasi?`,
					confirmation: result.data
				});
			} else {
				addMessage({ role: 'assistant', content: result.message });
			}
		} catch {
			addMessage({ role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' });
		} finally {
			loading = false;
			hasScrolledUp = false;
			await tick();
			scrollToBottom();
		}
	}

	function resolveCategoryId(categoryName: string, type: string): string {
		// 1. Exact name match
		const exact = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type);
		if (exact) return exact.id;

		// 2. Partial name match (e.g., "Makanan" matches "Makanan & Minuman")
		const partial = categories.find((c) => c.name.toLowerCase().includes(categoryName.toLowerCase()) && c.type === type);
		if (partial) return partial.id;

		const categoryParts = categories.filter((c) => c.type === type);
		const fromParts = categoryParts.find((c) => categoryName.toLowerCase().includes(c.name.toLowerCase()));
		if (fromParts) return fromParts.id;

		// 3. Fallback to "Lainnya" category
		const lainnya = categories.find((c) => c.name === 'Lainnya' && c.type === type);
		return lainnya?.id ?? categoryParts[0]?.id ?? '';
	}

	async function confirmTransaction(msg: ChatMessage) {
		if (!msg.confirmation || msg.confirmed) return;
		const confirmation = msg.confirmation;

		const categoryId = resolveCategoryId(confirmation.category, confirmation.type);
		if (!categoryId) {
			addMessage({ role: 'assistant', content: '❌ Kategori tidak ditemukan. Silakan input manual.' });
			return;
		}

		try {
			const useCase = new CreateTransactionUseCase(getTransactionRepo());
			await withMutation(() => useCase.execute({
				type: confirmation.type,
				amount: confirmation.amount,
				categoryId,
				date: confirmation.date,
				note: confirmation.note
			}));
			msg.confirmed = true;

			addMessage({
				role: 'assistant',
				content: `✅ Transaksi berhasil dicatat!\n${confirmation.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} Rp ${confirmation.amount.toLocaleString('id-ID')}\nKategori: ${confirmation.category}`
			});
		} catch (err) {
			addMessage({
				role: 'assistant',
				content: `❌ Gagal mencatat transaksi. Error: ${err instanceof Error ? err.message : 'Unknown'}. Silakan coba lagi atau input manual.`
			});
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

<svelte:head><title>Chat — MemFinance</title></svelte:head>

<div class="mx-auto flex h-[calc(100dvh-9rem)] min-h-[32rem] max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:h-[calc(100dvh-7rem)]">
	<header class="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5 dark:border-gray-800">
		<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true">
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 9h10M7 13h6M6 19l-3 2 1-4a8 8 0 1 1 3 2Z" /></svg>
		</div>
		<div class="min-w-0">
			<h1 class="font-semibold text-gray-950 dark:text-white">Catat dengan AI</h1>
			<p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">Tulis seperti biasa; selalu tinjau detail sebelum menyimpan.</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" bind:this={messagesContainer} onscroll={onScroll} aria-live="polite" aria-label="Percakapan pencatatan transaksi">
		{#each messages as msg, i}
			{#if msg.role === 'user'}
				<div class="flex justify-end motion-reduce:transition-none" transition:slide={{ duration: 180 }}>
					<div class="max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-4 py-3 text-sm leading-6 text-white shadow-sm whitespace-pre-wrap">{msg.content}</div>
				</div>
			{:else if msg.confirmation && !msg.confirmed}
				<div class="flex justify-start motion-reduce:transition-none" transition:slide={{ duration: 180 }}>
					<div class="max-w-[92%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm space-y-3 dark:bg-gray-800">
						<p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.content}</p>
						<div class="rounded-xl border border-gray-200 bg-white p-3.5 space-y-3 dark:border-gray-700 dark:bg-gray-900">
							<div class="flex items-center justify-between gap-3 text-xs text-gray-500">
								<span class="inline-flex items-center gap-1.5 font-medium {msg.confirmation.type === 'expense' ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}"><span class="h-2 w-2 rounded-full {msg.confirmation.type === 'expense' ? 'bg-red-500' : 'bg-green-500'}"></span>{msg.confirmation.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</span>
								<span class="font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatRupiah(msg.confirmation.amount)}</span>
							</div>
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>Kategori: <strong class="text-gray-700 dark:text-gray-300">{msg.confirmation.category}</strong></span>
								<span>{msg.confirmation.date}</span>
							</div>
							{#if msg.confirmation.note}<p class="text-xs text-gray-400 italic">{msg.confirmation.note}</p>{/if}
							<div class="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
								<button onclick={() => confirmTransaction(msg)}
									class="min-h-10 rounded-xl bg-green-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
								>Simpan</button>
								<button onclick={() => msg.confirmed = true}
									class="min-h-10 rounded-xl bg-gray-100 px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
								>Batal</button>
							</div>
						</div>
					</div>
				</div>
			{:else if msg.role === 'assistant'}
				<div class="flex justify-start motion-reduce:transition-none" transition:slide={{ duration: 180 }}>
					<div class="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm leading-6 text-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-pre-wrap">{msg.content}</div>
				</div>
			{/if}
		{/each}

		{#if loading}
			<div class="flex justify-start" transition:fade={{ duration: 150 }}>
				<div class="flex items-center gap-1.5 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md">
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
					<span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
				</div>
			</div>
		{/if}
	</div>

	<div class="border-t border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900">
		<div class="mb-2 flex flex-wrap gap-2" aria-label="Contoh pesan">
			{#each ['Beli kopi 35rb', 'Makan siang 25rb', 'Gaji bulan ini 5jt'] as suggestion}
				<button type="button" class="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onclick={() => input = suggestion}>{suggestion}</button>
			{/each}
		</div>
		<form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex items-end gap-2">
			<label class="sr-only" for="chat-input">Tulis transaksi</label>
			<input id="chat-input"
				type="text"
				bind:value={input}
				placeholder="Ketik transaksi... (contoh: Beli kopi 35rb)"
				disabled={loading}
				onkeydown={handleKeydown}
				class="min-h-11 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
			/>
			<Button type="submit" class="min-h-11 min-w-11 px-3" disabled={loading || !input.trim()}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
				<span class="sr-only">Kirim transaksi</span>
			</Button>
		</form>
		<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Tekan Enter untuk mengirim, Shift + Enter untuk baris baru.</p>
	</div>
</div>
