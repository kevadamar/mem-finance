<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getTransactionRepo, getCategoryRepo } from '$lib/data/repository-factory';
	import { CreateTransactionUseCase, TransactionValidationError } from '$lib/domain/usecases/create-transaction.usecase';
	import { validateTransaction } from '$lib/domain/validators/transaction.validator';
	import type { TransactionType, CreateTransactionInput } from '$lib/domain/entities/transaction';
	import type { Category } from '$lib/domain/entities/category';
	import { fromDateTimeLocalValue, toDateTimeLocalValue } from '$lib/utils/format';

	let {
		open = false,
		onclose,
		onsuccess
	}: {
		open: boolean;
		onclose: () => void;
		onsuccess?: () => void;
	} = $props();

	let categories = $state<Category[]>([]);
	let type = $state<TransactionType>('expense');
	let amount = $state('');
	let categoryId = $state('');
	let date = $state(new Date().toISOString().split('T')[0]);
	let createdAt = $state(toDateTimeLocalValue(new Date().toISOString()));
	let note = $state('');
	let errors = $state<Record<string, string>>({});
	let loading = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	onMount(async () => {
		categories = await getCategoryRepo().getAll();
	});

	let filteredCategories = $derived(categories.filter((c) => c.type === type));

	function formatAmountInput(value: string): string {
		const num = parseInt(value.replace(/\D/g, ''), 10);
		if (isNaN(num)) return '';
		return num.toLocaleString('id-ID');
	}

	function handleAmountInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const raw = target.value.replace(/\D/g, '');
		amount = raw;
		target.value = formatAmountInput(raw);
	}

	function resetForm() {
		type = 'expense';
		amount = '';
		categoryId = '';
		date = new Date().toISOString().split('T')[0];
		createdAt = toDateTimeLocalValue(new Date().toISOString());
		note = '';
		errors = {};
		loading = false;
	}

	async function handleSubmit() {
		errors = {};
		loading = true;

		const parsedAmount = parseInt(amount, 10);
		const input: CreateTransactionInput = {
			type,
			amount: isNaN(parsedAmount) ? 0 : parsedAmount,
			categoryId,
			date,
			note: note || undefined,
			createdAt: fromDateTimeLocalValue(createdAt)
		};

		const validation = validateTransaction(input);
		if (!validation.valid) {
			errors = {};
			for (const e of validation.errors) errors[e.field] = e.message;
			loading = false;
			return;
		}

		try {
			const useCase = new CreateTransactionUseCase(getTransactionRepo());
			await useCase.execute(input);
			toastMessage = 'Transaksi berhasil dicatat!';
			toastType = 'success';
			resetForm();
			onsuccess?.();
			onclose();
		} catch (err) {
			if (err instanceof TransactionValidationError) {
				for (const e of err.errors) errors[e.field] = e.message;
			} else {
				toastMessage = 'Gagal mencatat transaksi. Silakan coba lagi.';
				toastType = 'error';
			}
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		resetForm();
		onclose();
	}
</script>

<Modal {open} title={type === 'expense' ? 'Catat Pengeluaran' : 'Catat Pemasukan'} onclose={handleClose}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		<div class="flex gap-2">
			<button type="button" onclick={() => type = 'expense'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pengeluaran</button>
			<button type="button" onclick={() => type = 'income'} class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors {type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">Pemasukan</button>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah <span class="text-red-500">*</span></label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
				<input
					type="text"
					inputmode="numeric"
					placeholder="0"
					value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
					oninput={handleAmountInput}
					class="w-full pl-10 pr-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 {errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
				/>
			</div>
			{#if errors.amount}<p class="mt-1 text-xs text-red-500">{errors.amount}</p>{/if}
		</div>

		<Select
			label="Kategori"
			options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
			value={categoryId}
			error={errors.categoryId}
			required
			onchange={(e) => categoryId = (e.target as HTMLSelectElement).value}
		/>

		<Input label="Tanggal" type="date" value={date} error={errors.date} required onchange={(e) => date = (e.target as HTMLInputElement).value} />
		<Input label="Waktu dibuat" type="datetime-local" value={createdAt} error={errors.createdAt} required onchange={(e) => createdAt = (e.target as HTMLInputElement).value} />

		<Input label="Catatan" placeholder="Opsional: deskripsi transaksi" value={note} error={errors.note} oninput={(e) => note = (e.target as HTMLInputElement).value} />

		<div class="flex gap-3 pt-2">
			<Button variant="secondary" class="flex-1" onclick={handleClose}>Batal</Button>
			<Button type="submit" variant="primary" class="flex-1" {loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
		</div>
	</form>
</Modal>
