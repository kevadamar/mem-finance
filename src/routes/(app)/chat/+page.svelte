<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade, scale, slide } from 'svelte/transition';
	import { getTransactionRepo, getCategoryRepo } from '$lib/data/repository-factory';
	import { CreateTransactionUseCase } from '$lib/domain/usecases/create-transaction.usecase';
	import { withMutation } from '$lib/state/app.svelte';
	import { formatRupiah } from '$lib/utils/format';
	import type { ChatMessage, ParserResult } from '$lib/domain/entities/chat';
	import type { Category } from '$lib/domain/entities/category';
	import type Cropper from 'cropperjs';

	interface ReceiptOCRSuccessResponse {
		success: true;
		ocr: {
			status: string;
			message: string;
			data: Array<{ text: string; confidence: number; box: [number, number][] }>;
		};
		extracted: {
			totalAmount: number | null;
			totalAmountText: string | null;
			totalKeyword: string | null;
			confidence: number | null;
			rawText: string;
		};
	}

	interface ReceiptOCRErrorResponse {
		success: false;
		error: {
			code: string;
			message: string;
		};
	}

	type ReceiptOCRApiResponse = ReceiptOCRSuccessResponse | ReceiptOCRErrorResponse;

	const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
	const ACCEPTED_RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
	const RECEIPT_CROP_ASPECT_RATIO = 3 / 4;
	const RECEIPT_CROPPER_TEMPLATE = `
		<cropper-canvas background>
			<cropper-image rotatable scalable skewable translatable></cropper-image>
			<cropper-shade hidden></cropper-shade>
			<cropper-handle action="select" plain></cropper-handle>
			<cropper-selection initial-coverage="0.82" aspect-ratio="${RECEIPT_CROP_ASPECT_RATIO}" movable resizable keyboard outlined>
				<cropper-grid role="grid" bordered covered></cropper-grid>
				<cropper-crosshair centered></cropper-crosshair>
				<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.36)"></cropper-handle>
				<cropper-handle action="n-resize"></cropper-handle>
				<cropper-handle action="e-resize"></cropper-handle>
				<cropper-handle action="s-resize"></cropper-handle>
				<cropper-handle action="w-resize"></cropper-handle>
				<cropper-handle action="ne-resize"></cropper-handle>
				<cropper-handle action="nw-resize"></cropper-handle>
				<cropper-handle action="se-resize"></cropper-handle>
				<cropper-handle action="sw-resize"></cropper-handle>
			</cropper-selection>
		</cropper-canvas>
	`;

	let messages = $state<ChatMessage[]>([]);
	let input = $state('');
	let loading = $state(false);
	let categories = $state<Category[]>([]);
	let messagesContainer: HTMLDivElement | undefined = $state(undefined);
	let hasScrolledUp = $state(false);
	let attachedImage = $state<File | null>(null);
	let attachedImageUrl = $state('');
	let attachmentError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let cameraPreview = $state<HTMLVideoElement | null>(null);
	let cameraOpen = $state(false);
	let cameraStarting = $state(false);
	let cameraError = $state('');
	let imagePreviewOpen = $state(false);
	let cropOpen = $state(false);
	let cropSourceFile = $state<File | null>(null);
	let cropSourceUrl = $state('');
	let cropImageElement = $state<HTMLImageElement | null>(null);
	let cropOutputWidth = $state(1200);
	let cropError = $state('');
	let cropApplying = $state(false);
	let attachmentMenuOpen = $state(false);
	let isComposerDirty = $derived(input.trim().length > 1 || attachedImage !== null);
	let cameraStream: MediaStream | null = null;
	let receiptCropper: Cropper | null = null;
	let cropperInitToken = 0;

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

	onDestroy(() => {
		revokeAttachedImageUrl();
		destroyReceiptCropper();
		revokeCropSourceUrl();
		stopCameraStream();
	});

	$effect(() => {
		if (!cropOpen || !cropSourceUrl || !cropImageElement) return;

		const token = ++cropperInitToken;
		let disposed = false;

		void (async () => {
			try {
				const { default: CropperConstructor } = await import('cropperjs');
				if (disposed || token !== cropperInitToken || !cropImageElement) return;

				destroyReceiptCropper();
				receiptCropper = new CropperConstructor(cropImageElement, {
					template: RECEIPT_CROPPER_TEMPLATE
				});
			} catch {
				if (!disposed) {
					cropError = 'Editor crop/resize tidak bisa dimuat. Coba pilih gambar ulang.';
				}
			}
		})();

		return () => {
			disposed = true;
			if (token === cropperInitToken) destroyReceiptCropper();
		};
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

	function revokeAttachedImageUrl() {
		if (attachedImageUrl) {
			URL.revokeObjectURL(attachedImageUrl);
			attachedImageUrl = '';
		}
	}

	function revokeCropSourceUrl() {
		if (cropSourceUrl) {
			URL.revokeObjectURL(cropSourceUrl);
			cropSourceUrl = '';
		}
	}

	function destroyReceiptCropper() {
		receiptCropper?.destroy();
		receiptCropper = null;
	}

	function selectReceiptImage(file: File | null) {
		attachmentError = '';
		attachmentMenuOpen = false;
		if (!file) return;

		if (!ACCEPTED_RECEIPT_TYPES.has(file.type)) {
			attachmentError = 'Format gambar harus JPEG, PNG, atau WEBP.';
			return;
		}

		if (file.size > MAX_RECEIPT_FILE_SIZE) {
			attachmentError = 'Ukuran gambar maksimal 10MB.';
			return;
		}

		openCropEditor(file);
	}

	function handleFileInput(event: Event) {
		const inputEl = event.currentTarget as HTMLInputElement;
		selectReceiptImage(inputEl.files?.item(0) ?? null);
		inputEl.value = '';
	}

	function removeAttachedImage() {
		attachedImage = null;
		attachmentError = '';
		attachmentMenuOpen = false;
		imagePreviewOpen = false;
		revokeAttachedImageUrl();
		if (fileInput) fileInput.value = '';
	}

	function toggleAttachmentMenu(event: MouseEvent) {
		event.stopPropagation();
		attachmentMenuOpen = !attachmentMenuOpen;
	}

	function openGalleryPicker(event: MouseEvent) {
		event.stopPropagation();
		attachmentMenuOpen = false;
		fileInput?.click();
	}

	async function openCameraPicker(event: MouseEvent) {
		event.stopPropagation();
		attachmentMenuOpen = false;
		await openDeviceCamera();
	}

	function handleWindowClick() {
		attachmentMenuOpen = false;
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			attachmentMenuOpen = false;
			if (cameraOpen) closeCamera();
			if (imagePreviewOpen) imagePreviewOpen = false;
			if (cropOpen) closeCropEditor();
		}
	}

	function openCropEditor(file: File) {
		revokeCropSourceUrl();
		destroyReceiptCropper();
		cropSourceFile = file;
		cropSourceUrl = URL.createObjectURL(file);
		cropImageElement = null;
		cropOutputWidth = 1200;
		cropError = '';
		cropOpen = true;
	}

	function closeCropEditor() {
		cropOpen = false;
		cropApplying = false;
		cropError = '';
		cropSourceFile = null;
		cropImageElement = null;
		destroyReceiptCropper();
		revokeCropSourceUrl();
	}

	function resetCropControls() {
		receiptCropper?.getCropperImage()?.$resetTransform();
		receiptCropper?.getCropperSelection()?.$reset();
		cropOutputWidth = 1200;
	}

	function zoomCropper(delta: number) {
		receiptCropper?.getCropperImage()?.$zoom(delta);
	}

	function rotateCropper(degrees: number) {
		receiptCropper?.getCropperImage()?.$rotate(`${degrees}deg`);
	}

	async function applyCrop() {
		if (!cropSourceFile || !cropSourceUrl) return;
		cropError = '';
		cropApplying = true;

		try {
			const selection = receiptCropper?.getCropperSelection();
			if (!selection) throw new Error('Area crop belum siap. Tunggu sebentar lalu coba lagi.');

			const outputWidth = Number(cropOutputWidth);
			const outputHeight = Math.round(outputWidth / RECEIPT_CROP_ASPECT_RATIO);
			const canvas = await selection.$toCanvas({
				width: outputWidth,
				height: outputHeight
			});

			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
			if (!blob) throw new Error('Gagal membuat hasil crop gambar.');

			const baseName = cropSourceFile.name.replace(/\.[^.]+$/, '') || 'receipt';
			const croppedFile = new File([blob], `${baseName}-crop.jpg`, { type: 'image/jpeg' });
			revokeAttachedImageUrl();
			attachedImage = croppedFile;
			attachedImageUrl = URL.createObjectURL(croppedFile);
			closeCropEditor();
		} catch (err) {
			cropError = err instanceof Error ? err.message : 'Gagal memproses crop gambar.';
		} finally {
			cropApplying = false;
		}
	}

	function stopCameraStream() {
		if (cameraStream) {
			for (const track of cameraStream.getTracks()) track.stop();
			cameraStream = null;
		}
		if (cameraPreview) cameraPreview.srcObject = null;
	}

	async function openDeviceCamera() {
		cameraError = '';
		attachmentError = '';

		if (!navigator.mediaDevices?.getUserMedia) {
			attachmentError = 'Browser ini belum mendukung akses kamera langsung. Gunakan Galeri untuk memilih foto struk.';
			return;
		}

		cameraOpen = true;
		cameraStarting = true;
		await tick();

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: { ideal: 'environment' },
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}
			});
			cameraStream = stream;
			if (cameraPreview) {
				cameraPreview.srcObject = stream;
				await cameraPreview.play();
			}
		} catch {
			cameraError = 'Tidak bisa membuka kamera. Periksa izin kamera browser lalu coba lagi.';
			stopCameraStream();
		} finally {
			cameraStarting = false;
		}
	}

	function closeCamera() {
		cameraOpen = false;
		cameraError = '';
		cameraStarting = false;
		stopCameraStream();
	}

	async function captureCameraPhoto() {
		if (!cameraPreview || cameraPreview.videoWidth === 0 || cameraPreview.videoHeight === 0) {
			cameraError = 'Kamera belum siap. Tunggu sebentar lalu coba lagi.';
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.width = cameraPreview.videoWidth;
		canvas.height = cameraPreview.videoHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			cameraError = 'Tidak bisa mengambil gambar dari kamera.';
			return;
		}

		ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
		if (!blob) {
			cameraError = 'Tidak bisa menyimpan foto kamera.';
			return;
		}

		selectReceiptImage(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
		closeCamera();
	}

	function formatImageSize(size: number): string {
		if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
		return `${(size / 1024 / 1024).toFixed(1)}MB`;
	}

	async function runReceiptOcr(file: File): Promise<ReceiptOCRSuccessResponse> {
		const formData = new FormData();
		formData.append('file', file, file.name);

		const response = await fetch('/api/receipt-ocr', {
			method: 'POST',
			body: formData
		});
		const payload = (await response.json()) as ReceiptOCRApiResponse;

		if (!response.ok || !payload.success) {
			throw new Error(payload.success ? 'OCR gagal memproses gambar.' : payload.error.message);
		}

		return payload;
	}

	async function parseTransactionMessage(text: string): Promise<ParserResult> {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: text })
		});
		return await res.json();
	}

	function buildReceiptParserText(text: string, receipt: ReceiptOCRSuccessResponse): string {
		const amountText = receipt.extracted.totalAmount === null ? '' : `belanja struk ${Math.round(receipt.extracted.totalAmount)}`;
		return [text, amountText, receipt.extracted.rawText].filter(Boolean).join('\n');
	}

	function buildReceiptAssistantMessage(result: ParserResult, receipt: ReceiptOCRSuccessResponse): string {
		const total = receipt.extracted.totalAmount;
		const summary = total === null
			? 'Saya sudah membaca gambar struk, tapi totalnya belum yakin.'
			: `Saya membaca total struk ${formatRupiah(total)}.`;

		if (result.data) {
			return `${summary}\n\nSaya siapkan transaksi berikut. Tolong cek sebelum disimpan.`;
		}

		return `${summary}\n\n${result.message || 'Bisa tambahkan konteks transaksi seperti kategori atau tujuan belanja?'}`;
	}

	async function sendMessage() {
		const text = input.trim();
		const image = attachedImage;
		if ((!isComposerDirty && !image) || loading) return;

		input = '';
		removeAttachedImage();
		addMessage({
			role: 'user',
			content: [text, image ? `Lampiran struk: ${image.name}` : ''].filter(Boolean).join('\n')
		});
		loading = true;
		await tick();
		scrollToBottom();

		try {
			let result: ParserResult;
			let receipt: ReceiptOCRSuccessResponse | null = null;

			if (image) {
				receipt = await runReceiptOcr(image);
				result = await parseTransactionMessage(buildReceiptParserText(text, receipt));

				if (result.data && receipt.extracted.totalAmount !== null) {
					result = {
						...result,
						data: {
							...result.data,
							type: 'expense',
							amount: Math.round(receipt.extracted.totalAmount),
							note: result.data.note || text || `Struk ${image.name}`
						}
					};
				}
			} else {
				result = await parseTransactionMessage(text);
			}

			if (result.data) {
				addMessage({
					role: 'assistant',
					content: receipt
						? buildReceiptAssistantMessage(result, receipt)
						: result.message || `Saya tangkap: ${result.data.type === 'expense' ? '🔴 Pengeluaran' : '🟢 Pemasukan'} Rp ${result.data.amount.toLocaleString('id-ID')} untuk ${result.data.category}. Konfirmasi?`,
					confirmation: result.data
				});
			} else {
				addMessage({ role: 'assistant', content: receipt ? buildReceiptAssistantMessage(result, receipt) : result.message });
			}
		} catch (err) {
			addMessage({ role: 'assistant', content: err instanceof Error ? err.message : 'Maaf, terjadi kesalahan. Silakan coba lagi.' });
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
			if (isComposerDirty) sendMessage();
		}
	}
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} />
<svelte:head><title>Chat — MemFinance</title></svelte:head>

{#if cameraOpen}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="camera-capture-title" transition:fade={{ duration: 140 }}>
		<button type="button" class="absolute inset-0 cursor-default" aria-label="Tutup kamera" onclick={closeCamera}></button>
		<div class="relative w-full overflow-hidden rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:max-w-xl sm:rounded-2xl" transition:scale={{ duration: 160, start: 0.96 }}>
			<div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div>
					<h2 id="camera-capture-title" class="text-sm font-semibold text-white">Foto struk</h2>
					<p class="mt-0.5 text-xs text-gray-400">Arahkan kamera ke struk, lalu ambil foto.</p>
				</div>
				<button type="button" class="grid size-9 place-items-center rounded-xl text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={closeCamera} aria-label="Tutup kamera">
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="relative aspect-[3/4] max-h-[70dvh] bg-black sm:aspect-[4/3]">
				<video bind:this={cameraPreview} class="h-full w-full object-cover" autoplay playsinline muted></video>
				{#if cameraStarting}
					<div class="absolute inset-0 grid place-items-center bg-black/60">
						<div class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
							<span class="size-5 animate-spin rounded-full border-2 border-white/80 border-t-transparent motion-reduce:animate-none"></span>
							Membuka kamera...
						</div>
					</div>
				{/if}
			</div>
			{#if cameraError}
				<p class="border-t border-white/10 bg-rose-950/80 px-4 py-3 text-sm font-medium text-rose-100" role="alert">{cameraError}</p>
			{/if}
			<div class="flex items-center gap-3 border-t border-white/10 p-4">
				<button type="button" class="min-h-11 flex-1 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={closeCamera}>Batal</button>
				<button type="button" class="min-h-11 flex-1 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50" onclick={captureCameraPhoto} disabled={cameraStarting}>Ambil foto</button>
			</div>
		</div>
	</div>
{/if}

{#if imagePreviewOpen && attachedImageUrl && attachedImage}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title" transition:fade={{ duration: 140 }}>
		<button type="button" class="absolute inset-0 cursor-default" aria-label="Tutup preview gambar" onclick={() => imagePreviewOpen = false}></button>
		<div class="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-2xl" transition:scale={{ duration: 160, start: 0.96 }}>
			<div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div class="min-w-0">
					<h2 id="receipt-preview-title" class="truncate text-sm font-semibold text-white">{attachedImage.name}</h2>
					<p class="mt-0.5 text-xs text-gray-400">Preview gambar struk · {formatImageSize(attachedImage.size)}</p>
				</div>
				<button type="button" class="grid size-9 shrink-0 place-items-center rounded-xl text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={() => imagePreviewOpen = false} aria-label="Tutup preview gambar">
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>
			<div class="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
				<img src={attachedImageUrl} alt="Preview besar gambar struk" class="max-h-[75dvh] w-auto max-w-full rounded-xl object-contain" />
			</div>
		</div>
	</div>
{/if}

{#if cropOpen && cropSourceUrl && cropSourceFile}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="receipt-crop-title" transition:fade={{ duration: 140 }}>
		<button type="button" class="absolute inset-0 cursor-default" aria-label="Tutup crop gambar" onclick={closeCropEditor}></button>
		<div class="relative flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:rounded-2xl" transition:scale={{ duration: 160, start: 0.96 }}>
			<div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
				<div class="min-w-0">
					<h2 id="receipt-crop-title" class="truncate text-sm font-semibold text-white">Sesuaikan gambar struk</h2>
					<p class="mt-0.5 text-xs text-gray-400">Crop dan resize sebelum diproses OCR.</p>
				</div>
				<button type="button" class="grid size-9 shrink-0 place-items-center rounded-xl text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={closeCropEditor} aria-label="Tutup crop gambar">
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<div class="min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-black p-2 sm:p-4">
					<div class="receipt-cropper-shell mx-auto h-[58dvh] min-h-[18rem] max-h-[68dvh] w-full overflow-hidden rounded-2xl bg-gray-900 shadow-inner">
						<img
							bind:this={cropImageElement}
							src={cropSourceUrl}
							alt="Area crop gambar struk"
							class="block h-full w-full object-contain"
						/>
					</div>
				</div>

				<div class="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
					<div>
						<p class="truncate text-sm font-semibold text-white">{cropSourceFile.name}</p>
						<p class="mt-1 text-xs text-gray-400">Hasil akan dibuat sebagai JPEG baru.</p>
					</div>

					<div class="rounded-xl border border-amber-400/30 bg-amber-950/50 px-3 py-2 text-xs leading-5 text-amber-100" role="note">
						Beta: fitur crop/resize masih experimental. Cek preview gambar sebelum dikirim untuk OCR.
					</div>

					<div class="grid grid-cols-2 gap-2">
						<button type="button" class="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={() => zoomCropper(-0.1)} disabled={cropApplying}>Zoom -</button>
						<button type="button" class="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={() => zoomCropper(0.1)} disabled={cropApplying}>Zoom +</button>
						<button type="button" class="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={() => rotateCropper(-90)} disabled={cropApplying}>Putar kiri</button>
						<button type="button" class="min-h-10 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={() => rotateCropper(90)} disabled={cropApplying}>Putar kanan</button>
					</div>

					<div class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-gray-300">
						Drag gambar/area crop untuk menggeser. Tarik sudut area crop untuk menyesuaikan frame struk.
					</div>

					<label class="block">
						<span class="mb-2 flex items-center justify-between text-xs font-semibold text-gray-300"><span>Resize output</span><span>{cropOutputWidth}px</span></span>
						<input type="range" min="900" max="2200" step="100" bind:value={cropOutputWidth} class="w-full accent-primary-500" />
					</label>

					{#if cropError}
						<p class="rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-2 text-xs font-medium text-rose-100" role="alert">{cropError}</p>
					{/if}

					<div class="grid grid-cols-2 gap-2 pt-1">
						<button type="button" class="min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-400" onclick={resetCropControls} disabled={cropApplying}>Reset</button>
						<button type="button" class="min-h-11 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50" onclick={applyCrop} disabled={cropApplying}>{cropApplying ? 'Memproses...' : 'Gunakan gambar'}</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="mx-auto flex h-[calc(100dvh-12rem)] min-h-[24rem] max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-7.5rem)]">
	<header class="flex items-start gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4 dark:border-gray-800">
		<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true">
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 9h10M7 13h6M6 19l-3 2 1-4a8 8 0 1 1 3 2Z" /></svg>
		</div>
		<div class="min-w-0">
			<h1 class="font-semibold text-gray-950 dark:text-white">Catat dengan AI</h1>
			<p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">Tulis seperti biasa; selalu tinjau detail sebelum menyimpan.</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" bind:this={messagesContainer} onscroll={onScroll} aria-live="polite" aria-label="Percakapan pencatatan transaksi">
		{#each messages as msg, i}
			{#if msg.role === 'user'}
				<div class="flex justify-end motion-reduce:transition-none" transition:slide={{ duration: 180 }}>
					<div class="max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-4 py-3 text-sm leading-6 text-white shadow-sm whitespace-pre-wrap break-words">{msg.content}</div>
				</div>
			{:else if msg.confirmation && !msg.confirmed}
				<div class="flex justify-start motion-reduce:transition-none" transition:slide={{ duration: 180 }}>
					<div class="max-w-[92%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm space-y-3 dark:bg-gray-800">
						<p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{msg.content}</p>
						<div class="rounded-xl border border-gray-200 bg-white p-3.5 space-y-3 dark:border-gray-700 dark:bg-gray-900">
							<div class="flex items-center justify-between gap-3 text-xs text-gray-500">
								<span class="inline-flex items-center gap-1.5 font-medium {msg.confirmation.type === 'expense' ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}"><span class="h-2 w-2 rounded-full {msg.confirmation.type === 'expense' ? 'bg-red-500' : 'bg-green-500'}"></span>{msg.confirmation.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</span>
								<span class="font-bold tabular-nums text-gray-900 dark:text-gray-100">{formatRupiah(msg.confirmation.amount)}</span>
							</div>
							<div class="flex items-center justify-between text-xs text-gray-500">
								<span>Kategori: <strong class="text-gray-700 dark:text-gray-300">{msg.confirmation.category}</strong></span>
								<span>{msg.confirmation.date}</span>
							</div>
							{#if msg.confirmation.note}<p class="text-xs text-gray-400 italic break-words">{msg.confirmation.note}</p>{/if}
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
					<div class="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-sm leading-6 text-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-pre-wrap break-words">{msg.content}</div>
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
		<div class="mb-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap" aria-label="Contoh pesan">
			{#each ['Beli kopi 35rb', 'Makan siang 25rb', 'Gaji bulan ini 5jt'] as suggestion}
				<button type="button" class="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" onclick={() => input = suggestion}>{suggestion}</button>
			{/each}
		</div>
		<form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="space-y-2">
			<label class="sr-only" for="chat-input">Tulis transaksi</label>
			<input
				bind:this={fileInput}
				id="receipt-image-input"
				class="sr-only"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={handleFileInput}
				disabled={loading}
			/>
			{#if attachedImage}
				<div class="rounded-2xl border border-primary-200 bg-primary-50 p-2.5 dark:border-primary-900 dark:bg-primary-950/35" transition:slide={{ duration: 180 }}>
					<div class="flex items-start gap-3">
					{#if attachedImageUrl}
						<button type="button" class="group relative h-20 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:ring-white/10 sm:h-24 sm:w-20" onclick={() => imagePreviewOpen = true} aria-label="Lihat preview gambar struk">
							<img src={attachedImageUrl} alt="Preview gambar struk" class="h-full w-full object-cover" />
							<span class="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">Preview</span>
						</button>
					{:else}
						<div class="grid h-20 w-16 shrink-0 place-items-center rounded-xl bg-white text-primary-700 dark:bg-gray-900 dark:text-primary-300 sm:h-24 sm:w-20" aria-hidden="true">
							<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4-4a2 2 0 012.8 0l1.2 1.2L15 10a2 2 0 012.8 0L20 12.2M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1Z" /></svg>
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-primary-900 dark:text-primary-100">{attachedImage.name}</p>
								<p class="mt-0.5 text-xs text-primary-700/80 dark:text-primary-200/80">Siap diproses OCR · {formatImageSize(attachedImage.size)}</p>
							</div>
							<button
								type="button"
								class="grid size-8 shrink-0 place-items-center rounded-lg text-primary-700 transition-colors hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-primary-200 dark:hover:bg-primary-900/60"
								onclick={removeAttachedImage}
								aria-label="Hapus gambar struk"
							>
								<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
							</button>
						</div>
						<div class="mt-2 rounded-xl border border-primary-200/80 bg-white/70 px-3 py-2 text-xs leading-5 text-primary-800 dark:border-primary-800/70 dark:bg-primary-950/50 dark:text-primary-100" role="note">
							Saat ini hanya mendukung 1 gambar. Jika memilih atau mengambil foto baru, gambar ini akan diganti.
						</div>
					</div>
					</div>
				</div>
			{/if}

			{#if attachmentError}
				<p class="rounded-lg border border-danger-500/20 bg-danger-50 px-3 py-2 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" role="alert" transition:fade>{attachmentError}</p>
			{/if}

			<div class="relative">
				<button
					type="button"
					class="absolute left-1.5 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-gray-500 transition-[background-color,color,transform] hover:bg-gray-100 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-primary-300 {attachmentMenuOpen ? 'rotate-45 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300' : ''}"
					onclick={toggleAttachmentMenu}
					disabled={loading}
					aria-label={attachmentMenuOpen ? 'Tutup pilihan lampiran' : 'Buka pilihan lampiran'}
					aria-expanded={attachmentMenuOpen}
					aria-controls="receipt-attachment-menu"
					title="Tambah lampiran"
				>
					<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" /></svg>
				</button>
				{#if attachmentMenuOpen}
					<div
						id="receipt-attachment-menu"
						class="absolute bottom-full left-1.5 z-30 mb-2 flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg shadow-gray-900/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30"
						aria-label="Pilihan lampiran struk"
						transition:scale={{ duration: 140, start: 0.92 }}
					>
						<button
							type="button"
							class="flex min-h-10 items-center gap-2 rounded-xl px-3 pr-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-gray-200 dark:hover:bg-gray-800"
							onclick={openCameraPicker}
						>
							<span class="grid size-7 place-items-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300" aria-hidden="true">
								<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8a2 2 0 012-2h2l1.2-1.6A1 1 0 0110 4h4a1 1 0 01.8.4L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8Z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12.5a3 3 0 11-6 0 3 3 0 016 0Z" /></svg>
							</span>
							Kamera
						</button>
						<button
							type="button"
							class="flex min-h-10 items-center gap-2 rounded-xl px-3 pr-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-gray-200 dark:hover:bg-gray-800"
							onclick={openGalleryPicker}
						>
							<span class="grid size-7 place-items-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/70 dark:text-primary-300" aria-hidden="true">
								<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4-4a2 2 0 012.8 0l1.2 1.2L15 10a2 2 0 012.8 0L20 12.2M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1Z" /></svg>
							</span>
							Galeri
						</button>
					</div>
				{/if}
				<input
					id="chat-input"
					type="text"
					bind:value={input}
					placeholder={attachedImage ? 'Tambahkan konteks opsional...' : 'Ketik transaksi atau upload struk...'}
					disabled={loading}
					onkeydown={handleKeydown}
					class="min-h-12 w-full rounded-2xl border border-gray-300 bg-gray-50 py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-[border-color,box-shadow,background-color,padding] focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900 {isComposerDirty ? 'pr-14' : ''}"
				/>
				{#if isComposerDirty}
					<button
						type="submit"
						class="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl bg-primary-600 text-white shadow-sm transition-[background-color,transform,opacity] hover:bg-primary-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-400"
						disabled={loading}
						aria-label={loading ? 'Memproses transaksi' : 'Kirim transaksi'}
						transition:scale={{ duration: 140, start: 0.92 }}
					>
						{#if loading}
							<svg class="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" aria-hidden="true">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4Z" />
							</svg>
						{:else}
							<svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2Zm0 0v-8" /></svg>
						{/if}
					</button>
				{/if}
			</div>
		</form>
		<p class="mt-2 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">Tekan Enter untuk mengirim. Gambar struk akan dibaca otomatis sebelum konfirmasi.</p>
	</div>
</div>

<style>
	.receipt-cropper-shell :global(cropper-canvas) {
		height: 100%;
		width: 100%;
	}

	.receipt-cropper-shell :global(cropper-selection) {
		outline: 2px solid rgba(255, 255, 255, 0.9);
	}
</style>
