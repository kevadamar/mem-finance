<script lang="ts">
	import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { createBrowserClient } from '@supabase/ssr';
	import Button from '$lib/components/ui/Button.svelte';

	export type StorageOwnershipStatus =
		| 'CHOICE_REQUIRED'
		| 'SETUP_IN_PROGRESS'
		| 'ADMIN_OWNED'
		| 'TRANSFER_PENDING'
		| 'USER_OWNED_ADMIN_EDITOR'
		| 'ACCESS_RECOVERY'
		| 'SETUP_ERROR';

	let {
		status,
		googleConnected,
		connectedGoogleEmail,
		targetEmail
	}: {
		status: StorageOwnershipStatus;
		googleConnected: boolean;
		connectedGoogleEmail?: string;
		targetEmail?: string;
	} = $props();

	let loading = $state(false);
	let confirmTransfer = $state(false);
	let message = $state('');
	const canLinkGoogle = Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	function announce(nextMessage: string): void {
		message = nextMessage;
	}

	async function requestTransfer(): Promise<void> {
		if (loading) return;
		loading = true;
		announce('');
		try {
			const response = await fetch('/api/storage/transfer', { method: 'POST' });
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error?.message ?? 'Permintaan pemindahan belum dapat dibuat.');
			announce('Permintaan pemindahan dikirim. Terima undangan kepemilikan di Google Drive, lalu periksa status di sini.');
			confirmTransfer = false;
			window.dispatchEvent(new CustomEvent('memfinance-storage-status-changed'));
		} catch (error) {
			announce(error instanceof Error ? error.message : 'Permintaan pemindahan gagal. Coba lagi nanti.');
		} finally {
			loading = false;
		}
	}

	async function checkStatus(): Promise<void> {
		if (loading) return;
		loading = true;
		announce('');
		try {
			const response = await fetch('/api/storage/status');
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error?.message ?? 'Status belum dapat diperiksa.');
			announce(result.data?.message ?? 'Status penyimpanan sudah diperbarui.');
			window.dispatchEvent(new CustomEvent('memfinance-storage-status-changed'));
		} catch (error) {
			announce(error instanceof Error ? error.message : 'Status belum dapat diperiksa. Coba lagi nanti.');
		} finally {
			loading = false;
		}
	}

	async function linkGoogle(): Promise<void> {
		if (loading || !canLinkGoogle) {
			announce('Penghubungan Google belum tersedia. Hubungi admin aplikasi.');
			return;
		}
		loading = true;
		announce('');
		try {
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
			const { error } = await supabase.auth.linkIdentity({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
					// Existing files transfer by Google invitation; no Drive API token is stored.
				}
			});
			if (error) throw error;
		} catch (error) {
			loading = false;
			announce(error instanceof Error ? error.message : 'Google tidak dapat dihubungkan. Coba lagi nanti.');
		}
	}

	async function chooseAdmin(): Promise<void> {
		if (loading) return;
		loading = true;
		announce('');
		try {
			const response = await fetch('/api/storage/fallback', { method: 'POST' });
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error?.message ?? 'Spreadsheet belum dapat dibuat.');
			window.dispatchEvent(new CustomEvent('memfinance-storage-status-changed'));
		} catch (error) {
			announce(error instanceof Error ? error.message : 'Spreadsheet belum dapat dibuat.');
		} finally { loading = false; }
	}

	async function choosePersonal(): Promise<void> {
		if (loading || !canLinkGoogle) return;
		loading = true;
		announce('');
		try {
			const consent = await fetch('/api/storage/consent', { method: 'POST' });
			if (!consent.ok) throw new Error('Persetujuan Google belum dapat dimulai.');
			const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
			const options = { redirectTo: `${window.location.origin}/auth/callback?storage=personal`, scopes: 'https://www.googleapis.com/auth/drive.file', queryParams: { prompt: 'consent' } };
			const { error } = googleConnected
				? await supabase.auth.signInWithOAuth({ provider: 'google', options })
				: await supabase.auth.linkIdentity({ provider: 'google', options });
			if (error) throw error;
		} catch (error) {
			loading = false;
			announce(error instanceof Error ? error.message : 'Persetujuan Google gagal. Anda dapat memilih penyimpanan admin.');
		}
	}

	const content: Record<StorageOwnershipStatus, { title: string; description: string; tone: string }> = {
		CHOICE_REQUIRED: {
			title: 'Di mana data Anda disimpan?',
			description: 'Simpan langsung di Google Drive Anda dengan izin Google, atau gunakan spreadsheet khusus yang dikelola admin. Anda bisa memindahkan file admin ke Drive sendiri nanti.',
			tone: 'border-primary-300 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-100'
		},
		SETUP_IN_PROGRESS: {
			title: 'Menyiapkan spreadsheet',
			description: 'Penyiapan sedang diproses. Tunggu sebentar lalu muat ulang status.',
			tone: 'border-primary-300 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-100'
		},
		ADMIN_OWNED: {
			title: 'Spreadsheet dikelola admin',
			description: 'Data Anda ada di spreadsheet khusus yang masih dimiliki admin. Anda dapat memindahkan kepemilikannya ke Google Drive Anda. Admin tetap memiliki akses editor agar sinkronisasi aplikasi berfungsi.',
			tone: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100'
		},
		TRANSFER_PENDING: {
			title: 'Pemindahan kepemilikan menunggu persetujuan',
			description: 'Terima undangan kepemilikan di Google Drive. Spreadsheet tetap dapat digunakan selama proses ini.',
			tone: 'border-primary-300 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-100'
		},
		USER_OWNED_ADMIN_EDITOR: {
			title: 'Spreadsheet milik Anda',
			description: 'Aplikasi masih memiliki akses editor agar sinkronisasi melalui Apps Script tetap berjalan.',
			tone: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
		},
		ACCESS_RECOVERY: {
			title: 'Akses spreadsheet perlu dipulihkan',
			description: 'Aplikasi belum dapat mengakses spreadsheet aktif dengan aman. Jangan membuat spreadsheet baru agar data tidak terpecah.',
			tone: 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100'
		},
		SETUP_ERROR: {
			title: 'Spreadsheet belum siap',
			description: 'Penyimpanan data belum dapat disiapkan. Pilih kembali Google Drive Anda atau penyimpanan admin.',
			tone: 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100'
		}
	};
</script>

<section class="rounded-xl border-[1.5px] border-[var(--border-strong)] shadow-[var(--shadow-retro-sm)] {status === 'CHOICE_REQUIRED' || status === 'SETUP_ERROR' ? 'mx-auto mt-8 max-w-2xl p-6 sm:mt-14 sm:p-8' : 'mb-4 p-4 sm:mb-6 sm:flex sm:items-center sm:justify-between sm:gap-5'} {content[status].tone}" aria-labelledby="storage-ownership-title">
	<div class="min-w-0">
		<h2 id="storage-ownership-title" class="font-extrabold {status === 'CHOICE_REQUIRED' || status === 'SETUP_ERROR' ? 'text-xl sm:text-2xl' : 'text-sm'}">{content[status].title}</h2>
		<p class="mt-1 max-w-3xl text-sm leading-6 opacity-90">{content[status].description}</p>
		{#if targetEmail && status === 'TRANSFER_PENDING'}
			<p class="mt-1 text-xs opacity-80">Undangan dikirim ke: {targetEmail}</p>
		{/if}
		{#if message}<p class="mt-2 text-sm font-medium" role="status">{message}</p>{/if}
		{#if confirmTransfer}
			<p class="mt-2 text-sm font-medium">Google akan mengirim undangan kepemilikan ke akun Anda. File dan data tetap sama; status berubah setelah Anda menerima undangan.</p>
		{/if}
		{#if (status === 'CHOICE_REQUIRED' || status === 'SETUP_ERROR') && connectedGoogleEmail}
			<p class="mt-1 text-xs opacity-80">Saat Google meminta izin, pilih akun {connectedGoogleEmail} yang terhubung dengan MemFinance.</p>
		{/if}
	</div>
	<div class="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
		{#if status === 'CHOICE_REQUIRED' || status === 'SETUP_ERROR'}
			<Button size="sm" onclick={choosePersonal} {loading}>Simpan di Drive saya</Button>
			<Button size="sm" variant="secondary" onclick={chooseAdmin} {loading}>Gunakan penyimpanan admin</Button>
		{:else if status === 'SETUP_IN_PROGRESS'}
			<Button size="sm" variant="secondary" onclick={() => window.dispatchEvent(new CustomEvent('memfinance-storage-status-changed'))}>Muat ulang status</Button>
		{:else if status === 'ADMIN_OWNED'}
			{#if googleConnected}
				{#if confirmTransfer}
					<Button size="sm" onclick={requestTransfer} {loading}>Kirim undangan transfer</Button>
					<Button size="sm" variant="secondary" onclick={() => confirmTransfer = false}>Batal</Button>
				{:else}
					<Button size="sm" onclick={() => confirmTransfer = true}>Pindahkan ke Drive saya</Button>
				{/if}
			{:else}
				<Button size="sm" onclick={linkGoogle} {loading}>Hubungkan Google Drive</Button>
			{/if}
		{:else if status === 'ACCESS_RECOVERY'}
			<Button size="sm" onclick={choosePersonal} {loading}>Pulihkan akses Google</Button>
			<Button size="sm" variant="secondary" onclick={checkStatus} {loading}>Periksa status</Button>
		{:else if status === 'TRANSFER_PENDING'}
			<Button size="sm" variant="secondary" onclick={checkStatus} {loading}>Periksa status</Button>
		{/if}
	</div>
</section>
