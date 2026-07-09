<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { getCategoryRepo } from '$lib/data/repository-factory';
	import * as idb from '$lib/data/idb';
	import { STORES } from '$lib/data/idb';
	import { app, showToast, loadCategoriesFromCache } from '$lib/state/app.svelte';
	import type { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '$lib/domain/entities/category';

	const COLOR_PRESETS = ['#FF6B6B', '#F59E0B', '#F97316', '#4ECDC4', '#06B6D4', '#F43F5E', '#FFE66D', '#8B5CF6', '#A78BFA', '#EC4899', '#22C55E', '#3B82F6', '#10B981', '#6366F1', '#14B8A6', '#6B7280'];

	let catModalOpen = $state(false);
	let catEditId = $state<string | null>(null);
	let catFormName = $state('');
	let catFormType = $state<CategoryType>('expense');
	let catFormColor = $state('#6B7280');
	let catFormIcon = $state('more-horizontal');
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
		catFormIcon = c.icon;
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

<svelte:head><title>Kategori — MemFinance</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Kategori</h1>
		<Button onclick={openCatAdd}>+ Tambah</Button>
	</div>

	<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
		<div class="p-5">
			<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Pengeluaran</p>
			{#if expenseCats.length === 0}
				<p class="text-sm text-gray-400 py-4 text-center">Belum ada kategori pengeluaran</p>
			{:else}
				<div class="space-y-1">
					{#each expenseCats as c}
						<div class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
							<div class="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-gray-200 dark:ring-gray-700" style="background-color: {c.color}"></div>
							<span class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
							{#if c.isDefault}<span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">default</span>{/if}
							<button onclick={() => openCatEdit(c)} class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" aria-label="Edit">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
							</button>
							<button onclick={() => catDeleteConfirm = c.id} class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" aria-label="Nonaktifkan">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-t border-gray-200 dark:border-gray-800 p-5">
			<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Pemasukan</p>
			{#if incomeCats.length === 0}
				<p class="text-sm text-gray-400 py-4 text-center">Belum ada kategori pemasukan</p>
			{:else}
				<div class="space-y-1">
					{#each incomeCats as c}
						<div class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
							<div class="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-gray-200 dark:ring-gray-700" style="background-color: {c.color}"></div>
							<span class="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</span>
							{#if c.isDefault}<span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">default</span>{/if}
							<button onclick={() => openCatEdit(c)} class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" aria-label="Edit">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
							</button>
							<button onclick={() => catDeleteConfirm = c.id} class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" aria-label="Nonaktifkan">
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
					{#each inactiveCats as c}
						<div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/30">
							<div class="w-3.5 h-3.5 rounded-full shrink-0 opacity-40" style="background-color: {c.color}"></div>
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
		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama <span class="text-red-500">*</span></label>
			<input type="text" placeholder="Nama kategori" bind:value={catFormName}
				class="w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
		</div>

		{#if !isEditingCat}
			<div class="flex gap-2">
				<button type="button" onclick={() => catFormType = 'expense'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {catFormType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
				<button type="button" onclick={() => catFormType = 'income'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {catFormType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
			</div>
		{/if}

		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warna</label>
			<div class="flex flex-wrap gap-2">
				{#each COLOR_PRESETS as color}
					<button type="button" onclick={() => catFormColor = color} class="w-7 h-7 rounded-full border-2 transition-all {catFormColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}" style="background-color: {color}" aria-label={color}></button>
				{/each}
			</div>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ikon (Lucide icon name)</label>
			<input type="text" placeholder="more-horizontal" bind:value={catFormIcon}
				class="w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
