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
			resetForm();
			onsuccess?.();
			onclose();
		} catch (err) {
			if (err instanceof TransactionValidationError) {
				for (const e of err.errors) errors[e.field] = e.message;
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
		<div class="grid grid-cols-2 gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-1.5 shadow-[var(--shadow-retro-sm)]" aria-label="Tipe transaksi">
			<button
				type="button"
				onclick={() => { type = 'expense'; categoryId = ''; }}
				class="min-h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all {type === 'expense' ? 'border-[1.5px] border-[var(--border-strong)] bg-danger-50 text-danger-700 shadow-[var(--shadow-retro-sm)] dark:bg-danger-950/60 dark:text-danger-300' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				↓ Pengeluaran
			</button>
			<button
				type="button"
				onclick={() => { type = 'income'; categoryId = ''; }}
				class="min-h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all {type === 'income' ? 'border-[1.5px] border-[var(--border-strong)] bg-emerald-50 text-emerald-800 shadow-[var(--shadow-retro-sm)] dark:bg-emerald-950/60 dark:text-emerald-300' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
			>
				↑ Pemasukan
			</button>
		</div>

		<div>
			<label for="quick-transaction-amount" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
				Nominal Transaksi <span class="text-danger-600 font-bold">*</span>
			</label>
			<div class="relative">
				<span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[var(--text-tertiary)]">Rp</span>
				<input
					id="quick-transaction-amount"
					type="text"
					inputmode="numeric"
					placeholder="0"
					value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
					oninput={handleAmountInput}
					aria-invalid={errors.amount ? 'true' : undefined}
					class="min-h-11 w-full rounded-xl border-[1.5px] bg-[var(--surface-1)] py-2 pl-11 pr-3 font-mono text-base sm:text-lg font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] transition-[border-color,box-shadow] {errors.amount ? 'border-danger-600 ring-1 ring-danger-600/30' : 'border-[var(--border-strong)] focus:border-primary-600 focus:outline-none focus:shadow-[var(--shadow-retro)]'}"
				/>
			</div>
			{#if errors.amount}<p class="mt-1 text-xs font-bold text-danger-600">{errors.amount}</p>{/if}
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
