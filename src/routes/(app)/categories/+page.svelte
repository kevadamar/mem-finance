<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { getCategoryRepo } from '$lib/data/repository-factory';
	import * as idb from '$lib/data/idb';
	import { STORES } from '$lib/data/idb';
	import { app, showToast, loadCategoriesFromCache } from '$lib/state/app.svelte';
	import type { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '$lib/domain/entities/category';

	const COLOR_PRESETS = ['#FF6B6B', '#F59E0B', '#F97316', '#4ECDC4', '#06B6D4', '#F43F5E', '#FFE66D', '#8B5CF6', '#A78BFA', '#EC4899', '#22C55E', '#3B82F6', '#10B981', '#6366F1', '#14B8A6', '#6B7280'];
	const EMOJI_PRESETS = ['🍔', '☕', '🛒', '🚗', '⛽', '🛵', '🏠', '💡', '💊', '🎬', '✈️', '👕', '📱', '💼', '📈', '🎁', '💰', '💳', '🎓', '📦'];

	function getCategoryGlyph(c: { name: string; icon?: string }): string {
		if (c.icon && c.icon.length <= 2) return c.icon;
		const map: Record<string, string> = {
			'utensils-crossed': '🍽️',
			'cup-soda': '🥤',
			'cookie': '🍪',
			'car': '🚗',
			'fuel': '⛽',
			'bike': '🛵',
			'shopping-bag': '🛍️',
			'smartphone': '📱',
			'gamepad-2': '🎮',
			'tv': '📺',
			'receipt': '🧾',
			'zap': '⚡',
			'heart-pulse': '💊',
			'graduation-cap': '🎓',
			'cigarette': '🚬',
			'home': '🏠',
			'trending-up': '📈',
			'shopping-cart': '🛒',
			'heart': '❤️',
			'briefcase': '💼',
			'laptop': '💻',
			'gift': '🎁',
			'rotate-ccw': '🔄',
			'more-horizontal': '📦'
		};
		if (c.icon && map[c.icon]) return map[c.icon];
		return c.name ? c.name.slice(0, 1).toUpperCase() : '•';
	}

	let catModalOpen = $state(false);
	let catEditId = $state<string | null>(null);
	let catFormName = $state('');
	let catFormType = $state<CategoryType>('expense');
	let catFormColor = $state('#6B7280');
	let catFormIcon = $state('📦');
	let catDeleteConfirm = $state<string | null>(null);
	let inactiveCats = $state<Category[]>([]);

	let isEditingCat = $derived(catEditId !== null);

	let expenseCats = $derived(app.categories.filter((c) => c.type === 'expense' && c.flagActive !== false));
	let incomeCats = $derived(app.categories.filter((c) => c.type === 'income' && c.flagActive !== false));

	async function load() {
		await loadCategoriesFromCache();
		try {
			const cats = await getCategoryRepo().getAll();
			app.categories = cats;
		} catch { /* keep cached */ }
		const all = await idb.getAll<Category>(STORES.CATEGORIES);
		inactiveCats = all.filter((c) => c.flagActive === false);
	}

	onMount(load);

	function openCatAdd() {
		catEditId = null;
		catFormName = '';
		catFormType = 'expense';
		catFormColor = '#6B7280';
		catFormIcon = 'more-horizontal';
		catModalOpen = true;
	}

	function openCatEdit(c: Category) {
		catEditId = c.id;
		catFormName = c.name;
		catFormType = c.type;
		catFormColor = c.color;
		catFormIcon = c.icon || getCategoryGlyph(c);
		catModalOpen = true;
	}

	async function saveCat() {
		if (!catFormName.trim()) return;
		try {
			if (isEditingCat && catEditId) {
				const id: string = catEditId;
				const input: UpdateCategoryInput = { name: catFormName.trim(), color: catFormColor, icon: catFormIcon };
				const updated = await getCategoryRepo().update(id, input);
				app.categories = app.categories.map((c) => c.id === id ? updated : c);
				showToast('Kategori diperbarui', 'success');
			} else {
				const input: CreateCategoryInput = { name: catFormName.trim(), type: catFormType, color: catFormColor, icon: catFormIcon };
				const created = await getCategoryRepo().create(input);
				app.categories = [...app.categories, created];
				showToast('Kategori ditambahkan', 'success');
			}
			catModalOpen = false;
		} catch {
			showToast(isEditingCat ? 'Gagal memperbarui kategori' : 'Gagal menambah kategori', 'error');
		}
	}

	async function deleteCat(id: string) {
		const usageCount = app.transactions.filter((t) => t.categoryId === id).length;
		if (usageCount > 0) {
			showToast(`Kategori masih digunakan oleh ${usageCount} transaksi. Tidak dapat dinonaktifkan.`, 'warning');
			catDeleteConfirm = null;
			return;
		}
		try {
			await getCategoryRepo().delete(id);
			app.categories = app.categories.map((c) => c.id === id ? { ...c, flagActive: false } : c);
			inactiveCats = [...inactiveCats, { ...app.categories.find((c) => c.id === id)! } as unknown as Category];
			showToast('Kategori dinonaktifkan', 'success');
			catDeleteConfirm = null;
		} catch {
			showToast('Gagal menonaktifkan kategori', 'error');
		}
	}

	async function restoreCat(id: string) {
		try {
			const restored = await getCategoryRepo().restore(id);
			app.categories = app.categories.map((c) => c.id === id ? restored : c);
			inactiveCats = inactiveCats.filter((c) => c.id !== id);
			showToast('Kategori dipulihkan', 'success');
		} catch {
			showToast('Gagal memulihkan kategori', 'error');
		}
	}
</script>

<svelte:head><title>Kategori · MemFinance</title></svelte:head>

<div class="space-y-5 sm:space-y-6">
	<header class="retro-card p-4 sm:p-6 bg-[var(--surface-1)]">
		<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-primary)]">
			<span class="inline-block size-1.5 rounded-full bg-[var(--brand-primary)]"></span>
			Buku Kas · Indeks Kategori
		</div>
		<div class="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 class="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Kategori</h1>
				<p class="mt-0.5 text-xs sm:text-sm text-[var(--text-secondary)]">Buat kategori yang mudah dikenali agar laporan tetap rapi.</p>
			</div>
			<Button onclick={openCatAdd} class="min-h-11 shrink-0">+ Tambah kategori</Button>
		</div>
	</header>

	<div class="retro-card bg-[var(--surface-1)] overflow-hidden">
		<div class="p-4 sm:p-5">
			<div class="mb-3 flex items-center justify-between gap-3">
				<div>
					<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pengeluaran</p>
					<p class="mt-0.5 text-xs text-[var(--text-tertiary)]">Untuk transaksi dana keluar</p>
				</div>
				<span class="rounded-md border-[1.5px] border-[var(--border-strong)] bg-danger-50 px-2 py-0.5 font-mono text-xs font-bold text-danger-700 shadow-[1px_1px_0_var(--shadow-retro)] dark:bg-danger-950/40 dark:text-danger-300">{expenseCats.length}</span>
			</div>
			{#if expenseCats.length === 0}
				<p class="text-sm text-[var(--text-tertiary)] py-4 text-center font-mono">Belum ada kategori pengeluaran</p>
			{:else}
				<div class="space-y-1">
					{#each expenseCats as c (c.id)}
						<div class="group flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-transparent px-2.5 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/60 focus-within:bg-[var(--surface-2)]/60 sm:gap-3 sm:px-3 motion-reduce:transition-none" onclick={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button')) openCatEdit(c); }} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCatEdit(c); } }}>
							<div class="flex size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] text-base shadow-[1px_1px_0_var(--shadow-retro)]" style="background-color: {c.color}20">
								<span>{getCategoryGlyph(c)}</span>
							</div>
							<span class="flex-1 min-w-0 text-sm font-bold text-[var(--text-primary)] truncate">{c.name}</span>
							{#if c.isDefault}<span class="shrink-0 font-mono text-[10px] uppercase font-bold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-strong)] px-1.5 py-0.5 rounded">default</span>{/if}
							<button onclick={(e) => { e.stopPropagation(); openCatEdit(c); }} class="retro-btn-push grid min-h-8 min-w-8 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] hover:text-[var(--brand-primary)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none" aria-label={`Edit kategori ${c.name}`}>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
							</button>
							<button onclick={(e) => { e.stopPropagation(); catDeleteConfirm = c.id; }} disabled={c.isDefault} class="retro-btn-push grid min-h-8 min-w-8 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-danger-950/30 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none" aria-label={`Nonaktifkan kategori ${c.name}`}>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-t-[1.5px] border-[var(--border-strong)] p-4 sm:p-5">
			<div class="mb-3 flex items-center justify-between gap-3">
				<div>
					<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pemasukan</p>
					<p class="mt-0.5 text-xs text-[var(--text-tertiary)]">Untuk transaksi dana masuk</p>
				</div>
				<span class="rounded-md border-[1.5px] border-[var(--border-strong)] bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 shadow-[1px_1px_0_var(--shadow-retro)] dark:bg-emerald-950/40 dark:text-emerald-300">{incomeCats.length}</span>
			</div>
			{#if incomeCats.length === 0}
				<p class="text-sm text-[var(--text-tertiary)] py-4 text-center font-mono">Belum ada kategori pemasukan</p>
			{:else}
				<div class="space-y-1">
					{#each incomeCats as c (c.id)}
						<div class="group flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-transparent px-2.5 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/60 focus-within:bg-[var(--surface-2)]/60 sm:gap-3 sm:px-3 motion-reduce:transition-none" onclick={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button')) openCatEdit(c); }} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCatEdit(c); } }}>
							<div class="flex size-9 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] text-base shadow-[1px_1px_0_var(--shadow-retro)]" style="background-color: {c.color}20">
								<span>{getCategoryGlyph(c)}</span>
							</div>
							<span class="flex-1 min-w-0 text-sm font-bold text-[var(--text-primary)] truncate">{c.name}</span>
							{#if c.isDefault}<span class="shrink-0 font-mono text-[10px] uppercase font-bold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-strong)] px-1.5 py-0.5 rounded">default</span>{/if}
							<button onclick={(e) => { e.stopPropagation(); openCatEdit(c); }} class="retro-btn-push grid min-h-8 min-w-8 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] hover:text-[var(--brand-primary)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none" aria-label={`Edit kategori ${c.name}`}>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
							</button>
							<button onclick={(e) => { e.stopPropagation(); catDeleteConfirm = c.id; }} disabled={c.isDefault} class="retro-btn-push grid min-h-8 min-w-8 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-danger-950/30 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none" aria-label={`Nonaktifkan kategori ${c.name}`}>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if inactiveCats.length > 0}
			<div class="border-t border-gray-200 dark:border-gray-800 p-5">
				<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Nonaktif</p>
				<div class="space-y-1">
					{#each inactiveCats as c (c.id)}
						<div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30">
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm opacity-50" style="background-color: {c.color}20">
								<span>{getCategoryGlyph(c)}</span>
							</div>
							<span class="flex-1 text-sm text-gray-500 dark:text-gray-400 line-through truncate">{c.name}</span>
							<span class="text-[10px] text-gray-400 uppercase">{c.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</span>
							<button onclick={() => restoreCat(c.id)} class="px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">Pulihkan</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<Modal open={catModalOpen} title={isEditingCat ? 'Edit Kategori' : 'Tambah Kategori'} onclose={() => catModalOpen = false}>
	<div class="space-y-4">
		<Input label="Nama Kategori" placeholder="Contoh: Belanja Bulanan" bind:value={catFormName} required />

		{#if !isEditingCat}
			<div class="flex gap-2">
				<button type="button" onclick={() => catFormType = 'expense'} class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {catFormType === 'expense' ? 'bg-red-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
				<button type="button" onclick={() => catFormType = 'income'} class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors {catFormType === 'income' ? 'bg-green-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
			</div>
		{/if}

		<div>
			<p class="mb-2 text-sm font-semibold text-[var(--text-primary)]">Pilihan Warna</p>
			<div class="flex flex-wrap gap-2">
				{#each COLOR_PRESETS as color (color)}
					<button type="button" onclick={() => catFormColor = color} class="size-7 sm:size-8 rounded-full border-2 transition-all {catFormColor === color ? 'border-gray-900 dark:border-white scale-110 shadow-sm' : 'border-transparent'}" style="background-color: {color}" aria-label={color}></button>
				{/each}
			</div>
		</div>

		<div>
			<label for="cat-custom-icon" class="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">Ikon / Simbol</label>
			<div class="mb-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/50">
				{#each EMOJI_PRESETS as emoji (emoji)}
					<button type="button" onclick={() => catFormIcon = emoji} class="size-8 rounded-lg text-base flex items-center justify-center transition hover:scale-110 hover:bg-white dark:hover:bg-gray-700 {catFormIcon === emoji ? 'bg-white shadow-xs ring-2 ring-primary-500 dark:bg-gray-700' : ''}" aria-label={`Pilih ikon ${emoji}`}>
						{emoji}
					</button>
				{/each}
			</div>
			<Input id="cat-custom-icon" label="Emoji / Kode Ikon Kustom" placeholder="Ketik emoji atau nama ikon" bind:value={catFormIcon} />
		</div>

		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={() => catModalOpen = false}>Batal</Button>
			<Button variant="primary" class="flex-1" onclick={saveCat} disabled={!catFormName.trim()}>{isEditingCat ? 'Simpan' : 'Tambah'}</Button>
		</div>
	</div>
</Modal>

<Modal open={catDeleteConfirm !== null} title="Nonaktifkan Kategori?" onclose={() => catDeleteConfirm = null}>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Kategori yang dinonaktifkan bisa dipulihkan kembali. Kategori default tidak dapat dinonaktifkan.</p>
	<div class="flex gap-3">
		<Button variant="secondary" class="flex-1" onclick={() => catDeleteConfirm = null}>Batal</Button>
		<Button variant="danger" class="flex-1" onclick={() => catDeleteConfirm && deleteCat(catDeleteConfirm)}>Nonaktifkan</Button>
	</div>
</Modal>
