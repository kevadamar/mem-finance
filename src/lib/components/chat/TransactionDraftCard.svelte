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
	class="w-full rounded-2xl border-[1.5px] border-[var(--border-strong)] transition-all duration-150 overflow-hidden shadow-[var(--shadow-retro)]
		{draft.status === 'synced'
			? 'bg-[var(--surface-1)] dark:bg-emerald-950/20'
			: draft.status === 'saved_device'
			? 'bg-[var(--surface-1)] dark:bg-amber-950/20'
			: draft.status === 'failed'
			? 'bg-[var(--surface-1)] dark:bg-rose-950/20'
			: draft.status === 'cancelled'
			? 'bg-stone-100/60 opacity-60 dark:bg-stone-900/40'
			: 'bg-[var(--surface-1)]'}"
	data-testid="draft-card"
	data-draft-id={draft.id}
	data-status={draft.status}
>
	<!-- Status header bar for completed or ongoing states -->
	{#if draft.status === 'saving'}
		<div class="flex items-center gap-2 border-b-[1.5px] border-[var(--border-strong)] bg-emerald-50 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
			<svg class="h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-400" viewBox="0 0 24 24" fill="none">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
			</svg>
			<span>Menyimpan ke buku kas...</span>
		</div>
	{:else if draft.status === 'synced'}
		<div class="flex items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-emerald-100/80 px-4 py-2 font-mono text-xs font-bold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
			<div class="flex items-center gap-1.5">
				<span class="inline-block px-1.5 py-0.5 rounded border border-emerald-800 text-[10px] bg-white text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">[TERCATAT]</span>
				<span>Tersinkron di Server</span>
			</div>
			<span class="text-[11px] font-mono text-emerald-800/80 dark:text-emerald-300">OK</span>
		</div>
	{:else if draft.status === 'saved_device'}
		<div class="flex items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-amber-100/80 px-4 py-2 font-mono text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-200">
			<div class="flex items-center gap-1.5">
				<span class="inline-block px-1.5 py-0.5 rounded border border-amber-800 text-[10px] bg-white text-amber-950 dark:bg-amber-950 dark:text-amber-200">[OFFLINE]</span>
				<span>Tersimpan di Perangkat</span>
			</div>
			<span class="text-[11px] font-mono text-amber-800/80 dark:text-amber-300">PENDING</span>
		</div>
	{:else if draft.status === 'failed'}
		<div class="flex items-center justify-between border-b-[1.5px] border-[var(--border-strong)] bg-rose-100/80 px-4 py-2 font-mono text-xs font-bold text-rose-950 dark:bg-rose-950/60 dark:text-rose-200">
			<div class="flex items-center gap-1.5">
				<span class="inline-block px-1.5 py-0.5 rounded border border-rose-800 text-[10px] bg-white text-rose-950 dark:bg-rose-950 dark:text-rose-200">[GAGAL]</span>
				<span>Gagal Disimpan</span>
			</div>
		</div>
	{:else if draft.status === 'cancelled'}
		<div class="flex items-center gap-1.5 border-b-[1.5px] border-[var(--border-strong)] bg-stone-100 px-4 py-2 font-mono text-xs font-bold text-stone-600 dark:bg-stone-900 dark:text-stone-400">
			<span>[DIBATALKAN]</span>
		</div>
	{/if}

	<div class="p-4 sm:p-5 space-y-4">
		{#if isEditing}
			<!-- Inline Edit Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleSaveClick(); }} class="space-y-3.5">
				<div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
					<span class="text-xs font-bold text-[var(--text-primary)]">Koreksi Draf Transaksi</span>
					<button
						type="button"
						class="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
						onclick={cancelEditing}
					>
						Tutup
					</button>
				</div>

				<!-- Type selector -->
				<div>
					<label for="draft-type-{draft.id}" class="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Jenis Transaksi</label>
					<div class="grid grid-cols-2 gap-2" id="draft-type-{draft.id}">
						<button
							type="button"
							class="min-h-10 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider transition-all {editType === 'expense'
								? 'border-[1.5px] border-[var(--border-strong)] bg-danger-50 text-danger-700 dark:bg-danger-950/60 dark:text-danger-300 shadow-[var(--shadow-retro-sm)]'
								: 'border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
							onclick={() => handleTypeChange('expense')}
						>
							↓ Pengeluaran
						</button>
						<button
							type="button"
							class="min-h-10 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider transition-all {editType === 'income'
								? 'border-[1.5px] border-[var(--border-strong)] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-[var(--shadow-retro-sm)]'
								: 'border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}"
							onclick={() => handleTypeChange('income')}
						>
							↑ Pemasukan
						</button>
					</div>
				</div>

				<!-- Amount input -->
				<div>
					<label for="draft-amount-{draft.id}" class="block text-xs font-medium text-[var(--text-secondary)] mb-1">
						Nominal (Rp)
					</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-[var(--text-secondary)]">Rp</span>
						<input
							id="draft-amount-{draft.id}"
							type="number"
							min="1"
							step="1"
							bind:value={editAmount}
							class="w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] py-2 pl-9 pr-3 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none"
							placeholder="0"
							required
						/>
					</div>
					{#if localErrors.amount}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{localErrors.amount}</p>
					{/if}
				</div>

				<!-- Date picker with Quick Chips -->
				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="draft-date-{draft.id}" class="block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Pembukuan</label>
						<div class="flex items-center gap-1.5">
							<button
								type="button"
								class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-100 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
								onclick={() => setQuickDate(0)}
							>
								Hari ini
							</button>
							<button
								type="button"
								class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-100 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
						class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-primary-400"
						required
					/>
					{#if localErrors.date}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{localErrors.date}</p>
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
						class="w-full rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] font-medium focus:border-primary-600 focus:outline-none shadow-[var(--shadow-retro-sm)]"
						required
					>
						<option value="">Pilih Kategori...</option>
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
						<span class="text-[11px] text-gray-400 dark:text-gray-500">{editNote.length}/200</span>
					</div>
					<input
						id="draft-note-{draft.id}"
						type="text"
						maxlength="200"
						bind:value={editNote}
						class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-primary-400"
						placeholder="Misal: Makan bareng rekan kantor"
					/>
					{#if localErrors.note}
						<p class="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{localErrors.note}</p>
					{/if}
				</div>

				<!-- Action buttons inside edit mode -->
				<div class="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)]">
					<button
						type="button"
						class="retro-btn-push min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]"
						onclick={cancelEditing}
					>
						Batal Koreksi
					</button>
					<button
						type="submit"
						class="retro-btn-push min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]"
					>
						Simpan
					</button>
				</div>
			</form>
		{:else}
			<!-- Card View Mode: Tampilan Struk / Nota Digital -->
			<div class="space-y-3.5">
				<!-- Header Row: Type Stamp + Amount -->
				<div class="flex items-center justify-between gap-3 border-b-[1.5px] border-dashed border-[var(--border-subtle)] pb-3">
					<span
						class="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[var(--border-strong)] px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider shadow-[1px_1px_0px_var(--border-strong)]
							{draft.type === 'expense'
								? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
								: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}"
					>
						<span>{draft.type === 'expense' ? '↓ PENGELUARAN' : '↑ PEMASUKAN'}</span>
					</span>

					<span class="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
						{formatRupiah(draft.amount)}
					</span>
				</div>

				<!-- Key Info Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
					<div class="flex items-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 shadow-[var(--shadow-retro-sm)]">
						<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Kategori:</span>
						{#if draft.categoryId && draft.categoryName}
							<strong class="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">{draft.categoryName}</strong>
						{:else}
							<button
								type="button"
								class="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-700 hover:underline dark:text-amber-400"
								onclick={startEditing}
							>
								<span>⚠️ Pilih kategori</span>
							</button>
						{/if}
					</div>

					<div class="flex items-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2.5 shadow-[var(--shadow-retro-sm)]">
						<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Tanggal:</span>
						<strong class="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)]">{draft.date}</strong>
					</div>
				</div>

				<!-- Note if available -->
				{#if draft.note}
					<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2 text-xs text-[var(--text-primary)] break-words shadow-[var(--shadow-retro-sm)]">
						<span class="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mr-1.5">Catatan:</span>
						<span class="font-medium">{draft.note}</span>
					</div>
				{/if}

				<!-- Error display if any -->
				{#if draft.errorMessage}
					<div class="rounded-xl border-[1.5px] border-rose-600 bg-rose-50 p-2.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 shadow-[var(--shadow-retro-sm)]" role="alert">
						{draft.errorMessage}
					</div>
				{/if}
				{#if draft.validationErrors?.categoryId}
					<div class="rounded-xl border-[1.5px] border-amber-600 bg-amber-50 p-2.5 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 shadow-[var(--shadow-retro-sm)]">
						{draft.validationErrors.categoryId}
					</div>
				{/if}
			</div>

			<!-- Card Actions -->
			{#if draft.status === 'draft' || draft.status === 'failed'}
				<div class="grid grid-cols-3 gap-2.5 border-t-[1.5px] border-[var(--border-strong)] pt-3.5">
					<button
						type="button"
						class="min-h-11 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-3 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition-all hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
						onclick={startEditing}
					>
						Koreksi
					</button>

					<button
						type="button"
						class="min-h-11 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)] transition-all hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
						onclick={handleSaveClick}
					>
						{draft.status === 'failed' ? 'Coba Lagi' : 'Simpan'}
					</button>

					<button
						type="button"
						class="min-h-11 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-3 text-xs font-bold uppercase tracking-wider text-danger-600 shadow-[var(--shadow-retro-sm)] transition-all hover:bg-danger-50 hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
						onclick={handleCancelClick}
					>
						Batal
					</button>
				</div>
			{:else if draft.status === 'saving'}
				<div class="grid grid-cols-2 gap-2 border-t-[1.5px] border-[var(--border-strong)] pt-3">
					<button
						type="button"
						disabled
						class="min-h-11 rounded-xl border-[1.5px] border-stone-300 bg-stone-100 px-3 text-xs font-bold uppercase text-stone-400 cursor-not-allowed dark:border-stone-700 dark:bg-stone-800"
					>
						Menyimpan...
					</button>
					<button
						type="button"
						disabled
						class="min-h-11 rounded-xl border-[1.5px] border-stone-300 bg-stone-100 px-3 text-xs font-bold uppercase text-stone-400 cursor-not-allowed dark:border-stone-700 dark:bg-stone-800"
					>
						Batal
					</button>
				</div>
			{:else if draft.status === 'synced' || draft.status === 'saved_device'}
				<div class="border-t-[1.5px] border-[var(--border-strong)] pt-3 flex justify-end">
					{#if draft.savedTransactionId}
						<a
							href={resolve(`/transactions?id=${draft.savedTransactionId}`)}
							class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-emerald-50 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-900 shadow-[var(--shadow-retro-sm)] transition-all hover:shadow-[var(--shadow-retro)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:bg-emerald-950/60 dark:text-emerald-200"
						>
							<span>Lihat di Buku Kas</span>
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
