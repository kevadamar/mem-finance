<script lang="ts">
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/ui/Button.svelte';
	import { formatRupiah } from '$lib/utils/format';
	import type { OCRResponse, ParsedReceiptData } from '$lib/utils/receiptParser';

	type UploadState = 'idle' | 'uploading' | 'success' | 'error';

	interface ReceiptOCRSuccessResponse {
		success: true;
		ocr: OCRResponse;
		extracted: ParsedReceiptData;
	}

	interface ReceiptOCRErrorResponse {
		success: false;
		error: {
			code: string;
			message: string;
		};
	}

	type ReceiptOCRApiResponse = ReceiptOCRSuccessResponse | ReceiptOCRErrorResponse;

	const MAX_FILE_SIZE = 10 * 1024 * 1024;
	const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

	let uploadState = $state<UploadState>('idle');
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);
	let errorMessage = $state('');
	let result = $state<ReceiptOCRSuccessResponse | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	let canUpload = $derived(Boolean(selectedFile && uploadState !== 'uploading'));

	function handleInputChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		selectFile(input.files?.[0] ?? null);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		selectFile(event.dataTransfer?.files?.[0] ?? null);
	}

	function selectFile(file: File | null) {
		result = null;
		errorMessage = '';
		uploadState = 'idle';

		if (!file) {
			selectedFile = null;
			return;
		}

		if (!ACCEPTED_TYPES.has(file.type)) {
			selectedFile = null;
			uploadState = 'error';
			errorMessage = 'Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP.';
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			selectedFile = null;
			uploadState = 'error';
			errorMessage = 'File terlalu besar. Maksimum 10MB.';
			return;
		}

		selectedFile = file;
	}

	async function processReceipt() {
		if (!selectedFile) return;

		uploadState = 'uploading';
		errorMessage = '';
		result = null;

		const formData = new FormData();
		formData.append('file', selectedFile, selectedFile.name);

		try {
			const response = await fetch('/api/receipt-ocr', {
				method: 'POST',
				body: formData
			});
			const payload = (await response.json()) as ReceiptOCRApiResponse;

			if (!response.ok || !payload.success) {
				uploadState = 'error';
				errorMessage = payload.success ? 'OCR gagal memproses file.' : payload.error.message;
				return;
			}

			result = payload;
			uploadState = 'success';
		} catch {
			uploadState = 'error';
			errorMessage = 'Tidak dapat menghubungi layanan OCR. Periksa koneksi lalu coba lagi.';
		}
	}

	function resetUpload() {
		uploadState = 'idle';
		selectedFile = null;
		errorMessage = '';
		result = null;
		if (fileInput) fileInput.value = '';
	}

	function formatBytes(size: number): string {
		if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
		return `${(size / 1024 / 1024).toFixed(1)}MB`;
	}
</script>

<section class="app-surface overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]" aria-labelledby="receipt-ocr-title">
	<div class="border-b px-5 py-4">
		<p class="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">Receipt OCR</p>
		<h2 id="receipt-ocr-title" class="mt-1 text-lg font-bold tracking-tight text-[var(--text-primary)]">Scan struk transaksi</h2>
	</div>

	<div class="space-y-5 p-5">
		<label
			for="receipt-file"
			class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition-[background-color,border-color,box-shadow] focus-within:ring-2 focus-within:ring-primary-500 {isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-gray-300 bg-[var(--surface-2)] hover:border-primary-400 dark:border-gray-700'}"
			ondragover={(event) => {
				event.preventDefault();
				isDragging = true;
			}}
			ondragleave={() => (isDragging = false)}
			ondrop={handleDrop}
		>
			<span class="grid size-12 place-items-center rounded-2xl bg-white text-primary-700 shadow-sm dark:bg-gray-900 dark:text-primary-300" aria-hidden="true">
				<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01.88-7.9A5 5 0 0117.9 9.6 3.5 3.5 0 0117.5 16H15m-3-7v9m0-9-3 3m3-3 3 3" />
				</svg>
			</span>
			<span class="mt-3 text-sm font-semibold text-[var(--text-primary)]">
				{selectedFile ? selectedFile.name : 'Pilih atau tarik file struk'}
			</span>
			<span class="mt-1 text-xs text-[var(--text-secondary)]">
				JPEG, PNG, atau WEBP sampai 10MB{selectedFile ? ` (${formatBytes(selectedFile.size)})` : ''}
			</span>
			<input
				bind:this={fileInput}
				id="receipt-file"
				class="sr-only"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={handleInputChange}
				disabled={uploadState === 'uploading'}
			/>
		</label>

		<div class="flex flex-col gap-2 sm:flex-row">
			<Button class="w-full sm:w-auto" onclick={processReceipt} disabled={!canUpload} loading={uploadState === 'uploading'}>
				{uploadState === 'uploading' ? 'Memproses...' : 'Proses OCR'}
			</Button>
			{#if selectedFile || result || errorMessage}
				<Button variant="secondary" class="w-full sm:w-auto" onclick={resetUpload} disabled={uploadState === 'uploading'}>
					Reset
				</Button>
			{/if}
		</div>

		{#if uploadState === 'error'}
			<div class="rounded-xl border border-danger-500/25 bg-danger-50 px-4 py-3 text-sm font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" role="alert" transition:fade>
				{errorMessage}
			</div>
		{/if}

		{#if uploadState === 'success' && result}
			<div class="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]" transition:fade>
				<div class="rounded-2xl border border-gray-200 bg-[var(--surface-2)] p-4 dark:border-gray-800">
					<p class="text-sm font-semibold text-[var(--text-secondary)]">Total terdeteksi</p>
					<p class="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
						{result.extracted.totalAmount === null ? 'Belum ditemukan' : formatRupiah(result.extracted.totalAmount)}
					</p>
					{#if result.extracted.totalKeyword}
						<p class="mt-2 text-xs text-[var(--text-secondary)]">
							Dari kata kunci "{result.extracted.totalKeyword}" dan teks "{result.extracted.totalAmountText}".
						</p>
					{/if}
				</div>

				<div class="rounded-2xl border border-gray-200 dark:border-gray-800">
					<div class="border-b px-4 py-3">
						<p class="text-sm font-semibold text-[var(--text-primary)]">Raw read items</p>
					</div>
					<div class="max-h-72 divide-y divide-gray-200 overflow-auto dark:divide-gray-800">
						{#each result.ocr.data as item, index}
							<div class="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-3 px-4 py-2.5 text-sm">
								<span class="text-xs font-semibold text-[var(--text-secondary)]">{index + 1}</span>
								<span class="break-words text-[var(--text-primary)]">{item.text}</span>
								<span class="text-right text-xs tabular-nums text-[var(--text-secondary)]">{Math.round(item.confidence * 100)}%</span>
							</div>
						{/each}
						{#if result.ocr.data.length === 0}
							<p class="px-4 py-5 text-sm text-[var(--text-secondary)]">Tidak ada teks yang terbaca.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
