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

<section class="retro-card overflow-hidden bg-[var(--surface-1)]" aria-labelledby="receipt-ocr-title">
	<div class="border-b-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-4">
		<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-primary)]">
			<span class="inline-block size-1.5 rounded-full bg-[var(--brand-primary)]"></span>
			OCR Scanner
		</div>
		<h2 id="receipt-ocr-title" class="mt-1 text-lg font-black tracking-tight text-[var(--text-primary)]">Scan Struk Transaksi</h2>
	</div>

	<div class="space-y-5 p-5">
		<label
			for="receipt-file"
			class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed px-4 py-8 text-center transition-[background-color,border-color,box-shadow] focus-within:ring-2 focus-within:ring-primary-500 {isDragging ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40' : 'border-[var(--border-strong)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)]'}"
			ondragover={(event) => {
				event.preventDefault();
				isDragging = true;
			}}
			ondragleave={() => (isDragging = false)}
			ondrop={handleDrop}
		>
			<span class="grid size-12 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--brand-primary)] shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
				<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16a4 4 0 01.88-7.9A5 5 0 0117.9 9.6 3.5 3.5 0 0117.5 16H15m-3-7v9m0-9-3 3m3-3 3 3" />
				</svg>
			</span>
			<span class="mt-3 text-sm font-bold text-[var(--text-primary)]">
				{selectedFile ? selectedFile.name : 'Pilih atau tarik file struk'}
			</span>
			<span class="mt-1 font-mono text-xs text-[var(--text-secondary)]">
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
			<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50 px-4 py-3 font-mono text-xs font-bold text-danger-800 shadow-[var(--shadow-retro-sm)] dark:bg-rose-950/40 dark:text-rose-200" role="alert" transition:fade>
				{errorMessage}
			</div>
		{/if}

		{#if uploadState === 'success' && result}
			<div class="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]" transition:fade>
				<div class="retro-card p-4 bg-[var(--surface-2)]">
					<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Terdeteksi</p>
					<p class="mt-2 font-mono text-2xl font-black tabular-nums text-[var(--text-primary)]">
						{result.extracted.totalAmount === null ? 'Belum ditemukan' : formatRupiah(result.extracted.totalAmount)}
					</p>
					{#if result.extracted.totalKeyword}
						<p class="mt-2 font-mono text-xs text-[var(--text-tertiary)]">
							Dari kata kunci "{result.extracted.totalKeyword}" dan teks "{result.extracted.totalAmountText}".
						</p>
					{/if}
				</div>

				<div class="retro-card p-4 bg-[var(--surface-2)]">
					<div class="border-b px-4 py-3">
						<p class="text-sm font-semibold text-[var(--text-primary)]">Raw read items</p>
					</div>
					<div class="max-h-72 divide-y divide-gray-200 overflow-auto dark:divide-gray-800">
						{#each result.ocr.data as item, index (`${item.text}-${index}`)}
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
