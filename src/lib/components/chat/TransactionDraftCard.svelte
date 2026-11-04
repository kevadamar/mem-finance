<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatRupiah } from '$lib/utils/format';
	import { getTodayDateString, validateDraft } from '$lib/utils/chatDraft';
	import type { Category } from '$lib/domain/entities/category';
	import type { TransactionDraft, DraftStatus } from '$lib/domain/entities/chat';
	import type { TransactionType } from '$lib/domain/entities/transaction';

	interface Props {
		draft: TransactionDraft;
		categories: Category[];
		onSave: (draft: TransactionDraft) => Promise<void>;
		onCancel: (draft: TransactionDraft) => void;
		onUpdate?: (draft: TransactionDraft) => void;
	}

	let { draft = $bindable(), categories, onSave, onCancel, onUpdate }: Props = $props();

	let isEditing = $state(false);

	// Form edit state (isolated to this draft card)
	let editType = $state<TransactionType>(draft.type);
	let editAmount = $state<number>(draft.amount);
	let editDate = $state<string>(draft.date);
	let editCategoryId = $state<string>(draft.categoryId);
	let editNote = $state<string>(draft.note || '');
	let localErrors = $state<Record<string, string>>({});

	let announcement = $state('');

	// Active categories matching current edit type
	let activeCategoriesForType = $derived(
		categories.filter((c) => c.flagActive !== false && c.type === (isEditing ? editType : draft.type))
	);

	function updateAnnouncement(status: DraftStatus, err?: string) {
		switch (status) {
			case 'saving':
				announcement = 'Menyimpan transaksi ke pembukuan...';
				break;
			case 'synced':
				announcement = 'Transaksi berhasil tersinkron ke server.';
				break;
			case 'saved_device':
				announcement = 'Transaksi tersimpan di perangkat, menunggu sinkronisasi.';
				break;
			case 'failed':
				announcement = `Gagal menyimpan transaksi. ${err || ''}`;
				break;
			case 'cancelled':
				announcement = 'Draf transaksi dibatalkan.';
				break;
			default:
				announcement = '';
		}
	}

	function startEditing() {
		editType = draft.type;
		editAmount = draft.amount;
		editDate = draft.date;
		editCategoryId = draft.categoryId;
		editNote = draft.note || '';
		localErrors = {};
		isEditing = true;
	}

	function setQuickDate(offsetDays: number) {
		editDate = getTodayDateString(offsetDays);
	}

	function cancelEditing() {
		isEditing = false;
		localErrors = {};
	}

	function applyEditsToDraft(): boolean {
		const matchedCat = categories.find((c) => c.id === editCategoryId && c.flagActive !== false);
		const updated: TransactionDraft = {
			...draft,
			type: editType,
			amount: Number(editAmount) || 0,
			date: editDate,
			categoryId: editCategoryId,
			categoryName: matchedCat ? matchedCat.name : '',
			note: editNote.trim() || undefined
		};

		const validation = validateDraft(updated, categories);
		if (!validation.valid) {
			localErrors = validation.errors;
			return false;
		}

		localErrors = {};
		draft = updated;
		onUpdate?.(draft);
		return true;
	}

	async function handleSaveClick() {
		if (draft.status === 'saving') return;

		if (isEditing) {
			const valid = applyEditsToDraft();
			if (!valid) return;
			isEditing = false;
		} else {
			// Validate current draft before saving
			const validation = validateDraft(draft, categories);
			if (!validation.valid) {
				draft.validationErrors = validation.errors;
				// Automatically enter edit mode so user can see and fix error
				startEditing();
				localErrors = validation.errors;
				return;
			}
		}

		updateAnnouncement('saving');
		await onSave(draft);
		updateAnnouncement(draft.status, draft.errorMessage);
	}

	function handleCancelClick() {
		if (draft.status === 'saving') return;
		if (isEditing) {
			isEditing = false;
			return;
		}
		draft.status = 'cancelled';
		updateAnnouncement('cancelled');
		onCancel(draft);
	}

	// Synchronize edit category if editType changes
	function handleTypeChange(newType: TransactionType) {
		editType = newType;
		// If current editCategoryId is not valid for this type, clear it
		const cat = categories.find((c) => c.id === editCategoryId && c.flagActive !== false && c.type === newType);
		if (!cat) {
			editCategoryId = '';
		}
	}
</script>

<div class="sr-only" aria-live="polite" role="status">
	{announcement}
</div>

<div
	class="w-full rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm
		{draft.status === 'synced'
			? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
			: draft.status === 'saved_device'
			? 'border-amber-200 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20'
			: draft.status === 'failed'
			? 'border-rose-200 bg-rose-50/40 dark:border-rose-800/60 dark:bg-rose-950/20'
			: draft.status === 'cancelled'
			? 'border-gray-200 bg-gray-50/60 opacity-75 dark:border-gray-800 dark:bg-gray-900/40'
			: 'border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-850'}"
	data-testid="draft-card"
	data-draft-id={draft.id}
	data-status={draft.status}
>
	<!-- Status header bar for completed or ongoing states -->
	{#if draft.status === 'saving'}
		<div class="flex items-center gap-2 border-b border-primary-100 bg-primary-50 px-4 py-2.5 text-xs font-medium text-primary-800 dark:border-primary-900/50 dark:bg-primary-950/40 dark:text-primary-300">
			<svg class="h-4 w-4 animate-spin text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
			</svg>
			<span>Menyimpan transaksi...</span>
		</div>
	{:else if draft.status === 'synced'}
		<div class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
			<div class="flex items-center gap-1.5">
				<svg class="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
				</svg>
				<span>Tersinkron</span>
			</div>
			<span class="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">Tersimpan di server</span>
		</div>
	{:else if draft.status === 'saved_device'}
		<div class="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
			<div class="flex items-center gap-1.5">
				<svg class="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M1 10a9 9 0 1118 0 9 9 0 01-18 0zm9-4a.75.75 0 00-.75.75v3.5c0 .414.336.75.75.75h2.5a.75.75 0 000-1.5H10.75V6.75A.75.75 0 0010 6z" clip-rule="evenodd" />
				</svg>
				<span>Tersimpan di perangkat · menunggu sinkronisasi</span>
			</div>
		</div>
	{:else if draft.status === 'failed'}
		<div class="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
			<div class="flex items-center gap-1.5">
				<svg class="h-4 w-4 text-rose-600 dark:text-rose-400" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
				</svg>
				<span>Gagal disimpan</span>
			</div>
		</div>
	{:else if draft.status === 'cancelled'}
		<div class="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
			<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" />
			</svg>
			<span>Dibatalkan</span>
		</div>
	{/if}

	<div class="p-4 sm:p-5 space-y-4">
		{#if isEditing}
			<!-- Inline Edit Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleSaveClick(); }} class="space-y-3.5">
				<div class="flex items-center justify-between border-b border-gray-100 pb-2.5 dark:border-gray-800">
					<span class="text-xs font-semibold text-gray-900 dark:text-gray-100">Koreksi Draf Transaksi</span>
					<button
						type="button"
						class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						onclick={cancelEditing}
					>
						Tutup
					</button>
				</div>

				<!-- Type selector -->
				<div>
					<label for="draft-type-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Transaksi</label>
					<div class="grid grid-cols-2 gap-2" id="draft-type-{draft.id}">
						<button
							type="button"
							class="min-h-9 rounded-xl border text-xs font-medium transition-all {editType === 'expense'
								? 'border-red-500 bg-red-50 text-red-700 font-semibold dark:border-red-600 dark:bg-red-950/40 dark:text-red-300'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'}"
							onclick={() => handleTypeChange('expense')}
						>
							🔴 Pengeluaran
						</button>
						<button
							type="button"
							class="min-h-9 rounded-xl border text-xs font-medium transition-all {editType === 'income'
								? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'}"
							onclick={() => handleTypeChange('income')}
						>
							🟢 Pemasukan
						</button>
					</div>
				</div>

				<!-- Amount input -->
				<div>
					<label for="draft-amount-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Nominal (Rp)
					</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-gray-500">Rp</span>
						<input
							id="draft-amount-{draft.id}"
							type="number"
							min="1"
							step="1"
							bind:value={editAmount}
							class="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
							placeholder="0"
							required
						/>
					</div>
					{#if localErrors.amount}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{localErrors.amount}</p>
					{/if}
				</div>

				<!-- Date picker with Quick Chips -->
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="draft-date-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Pembukuan</label>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="rounded-lg border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
								onclick={() => setQuickDate(0)}
							>
								Hari ini
							</button>
							<button
								type="button"
								class="rounded-lg border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
								onclick={() => setQuickDate(-1)}
							>
								Kemarin
							</button>
						</div>
					</div>
					<input
						id="draft-date-{draft.id}"
						type="date"
						bind:value={editDate}
						class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						required
					/>
					{#if localErrors.date}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{localErrors.date}</p>
					{/if}
				</div>

				<!-- Category dropdown -->
				<div>
					<label for="draft-cat-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Kategori Aktif
					</label>
					<select
						id="draft-cat-{draft.id}"
						bind:value={editCategoryId}
						class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						required
					>
						<option value="">— Pilih Kategori —</option>
						{#each activeCategoriesForType as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
					{#if localErrors.categoryId}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{localErrors.categoryId}</p>
					{/if}
				</div>

				<!-- Note input -->
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="draft-note-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
						<span class="text-[11px] text-gray-400">{editNote.length}/200</span>
					</div>
					<input
						id="draft-note-{draft.id}"
						type="text"
						maxlength="200"
						bind:value={editNote}
						class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						placeholder="Misal: Makan bareng rekan kantor"
					/>
					{#if localErrors.note}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{localErrors.note}</p>
					{/if}
				</div>

				<!-- Action buttons inside edit mode -->
				<div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
					<button
						type="button"
						class="min-h-10 rounded-xl bg-gray-100 px-4 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						onclick={cancelEditing}
					>
						Batal Koreksi
					</button>
					<button
						type="submit"
						class="min-h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-400"
					>
						Simpan
					</button>
				</div>
			</form>
		{:else}
			<!-- Card View Mode -->
			<div class="space-y-3">
				<!-- Header Row: Type Badge + Amount -->
				<div class="flex items-center justify-between gap-3">
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold
							{draft.type === 'expense'
								? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
								: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}"
					>
						<span class="h-1.5 w-1.5 rounded-full {draft.type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
						{draft.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
					</span>

					<span class="text-base font-bold tabular-nums text-gray-950 dark:text-gray-50">
						{formatRupiah(draft.amount)}
					</span>
				</div>

				<!-- Key Info Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
					<div class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
						<span class="text-gray-500 dark:text-gray-400">Kategori:</span>
						{#if draft.categoryId && draft.categoryName}
							<strong class="text-gray-900 dark:text-gray-100 font-medium truncate">{draft.categoryName}</strong>
						{:else}
							<button
								type="button"
								class="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline dark:text-amber-400"
								onclick={startEditing}
							>
								<span>⚠️ Pilih kategori</span>
							</button>
						{/if}
					</div>

					<div class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
						<span class="text-gray-500 dark:text-gray-400">Tanggal:</span>
						<strong class="text-gray-900 dark:text-gray-100 font-medium">{draft.date}</strong>
					</div>
				</div>

				<!-- Note if available -->
				{#if draft.note}
					<div class="rounded-xl bg-gray-50/70 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/40 dark:text-gray-300 break-words">
						<span class="text-gray-400 dark:text-gray-500">Catatan:</span> {draft.note}
					</div>
				{/if}

				<!-- Error display if any -->
				{#if draft.errorMessage}
					<div class="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200" role="alert">
						{draft.errorMessage}
					</div>
				{/if}
				{#if draft.validationErrors?.categoryId}
					<div class="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
						{draft.validationErrors.categoryId}
					</div>
				{/if}
			</div>

			<!-- Card Actions -->
			{#if draft.status === 'draft' || draft.status === 'failed'}
				<div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
					<button
						type="button"
						class="min-h-10 rounded-xl bg-gray-100 px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						onclick={startEditing}
					>
						Ubah
					</button>

					<button
						type="button"
						class="min-h-10 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-400"
						onclick={handleSaveClick}
					>
						{draft.status === 'failed' ? 'Coba lagi' : 'Simpan'}
					</button>

					<button
						type="button"
						class="min-h-10 rounded-xl bg-gray-50 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
						onclick={handleCancelClick}
					>
						Batal
					</button>
				</div>
			{:else if draft.status === 'saving'}
				<div class="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
					<button
						type="button"
						disabled
						class="min-h-10 rounded-xl bg-gray-100 px-3 text-xs font-semibold text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
					>
						Menyimpan...
					</button>
					<button
						type="button"
						disabled
						class="min-h-10 rounded-xl bg-gray-100 px-3 text-xs font-semibold text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
					>
						Batal
					</button>
				</div>
			{:else if draft.status === 'synced' || draft.status === 'saved_device'}
				<div class="border-t border-gray-100 pt-3 dark:border-gray-800 flex justify-end">
					{#if draft.savedTransactionId}
						<a
							href={resolve(`/transactions?id=${draft.savedTransactionId}`)}
							class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-primary-700 border border-primary-200 shadow-xs transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-primary-300 dark:border-primary-800/70 dark:hover:bg-gray-750"
						>
							<span>Lihat transaksi</span>
							<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
							</svg>
						</a>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
