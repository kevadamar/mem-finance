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

<div class="h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
	<div class="flex-1 overflow-y-auto p-4 space-y-4" bind:this={messagesContainer} onscroll={onScroll}>
		{#each messages as msg, i}
			{#if msg.role === 'user'}
				<div class="flex justify-end" transition:slide={{ duration: 200 }}>
					<div class="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-primary-600 text-white text-sm whitespace-pre-wrap">{msg.content}</div>
				</div>
			{:else if msg.confirmation && !msg.confirmed}
				<div class="flex justify-start" transition:slide={{ duration: 200 }}>
					<div class="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100 dark:bg-gray-800 text-sm space-y-3">
						<p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.content}</p>
						<div class="bg-white dark:bg-gray-900 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>{msg.confirmation.type === 'expense' ? '🔴 Pengeluaran' : '🟢 Pemasukan'}</span>
								<span class="font-semibold text-gray-900 dark:text-gray-100">{formatRupiah(msg.confirmation.amount)}</span>
							</div>
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>Kategori: <strong class="text-gray-700 dark:text-gray-300">{msg.confirmation.category}</strong></span>
								<span>{msg.confirmation.date}</span>
							</div>
							{#if msg.confirmation.note}<p class="text-xs text-gray-400 italic">{msg.confirmation.note}</p>{/if}
							<div class="flex justify-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
								<button onclick={() => confirmTransaction(msg)}
									class="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
								>✅ Simpan</button>
								<button onclick={() => msg.confirmed = true}
									class="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
								>❌ Batal</button>
							</div>
						</div>
					</div>
				</div>
			{:else if msg.role === 'assistant'}
				<div class="flex justify-start" transition:slide={{ duration: 200 }}>
					<div class="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{msg.content}</div>
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

	<div class="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
		<form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2">
			<input
				type="text"
				bind:value={input}
				placeholder="Ketik transaksi... (contoh: Beli kopi 35rb)"
				disabled={loading}
				onkeydown={handleKeydown}
				class="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
			/>
			<Button type="submit" disabled={loading || !input.trim()}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
			</Button>
		</form>
	</div>
</div>
