<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { fade } from 'svelte/transition';
	import { fly } from 'svelte/transition';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { createBrowserClient } from '@supabase/ssr';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	let supabaseConfigured = $state(!!PUBLIC_SUPABASE_URL && !!PUBLIC_SUPABASE_PUBLISHABLE_KEY);

	let step = $state<'email' | 'otp'>('email');
	let email = $state('');
	let otpDigits = $state(['', '', '', '', '', '']);
	let captchaToken = $state('');
	let loading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let resendCooldown = $state(0);
	let turnstileReady = $state(false);
	let turnstileWidgetId: string | undefined;

	$effect(() => {
		if (data?.authError) {
			error = data.authError;
		}
	});

	let supabase = supabaseConfigured 
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)
		: null;

	let emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
	let otpToken = $derived(otpDigits.join(''));
	let otpComplete = $derived(otpToken.length === 6);
	let canResend = $derived(resendCooldown === 0 && !loading);

	function resetError() { error = ''; }

	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		script.async = true;
		script.onload = () => {
			const el = document.getElementById('turnstile-widget');
			if (el && window.turnstile) {
				turnstileWidgetId = window.turnstile.render('#turnstile-widget', {
					sitekey: PUBLIC_TURNSTILE_SITE_KEY,
					callback: (token: string) => { captchaToken = token; },
					theme: 'light',
					size: 'normal'
				});
				turnstileReady = true;
			}
		};
		document.head.appendChild(script);
		return () => { script.remove(); };
	});

	async function handleSendOtp() {
		if (!emailValid || loading || !supabase) return;
		resetError();
		loading = true;

		const { error: sendError } = await supabase.auth.signInWithOtp({
			email,
			options: { captchaToken }
		});

		loading = false;

		if (sendError) {
			if (sendError.status === 429) {
				error = 'Terlalu banyak permintaan. Coba lagi nanti.';
			} else {
				error = 'Gagal mengirim kode OTP. Periksa koneksi dan coba lagi.';
			}
			resetCaptcha();
			return;
		}

		successMessage = `Kode OTP telah dikirim ke ${email}`;
		step = 'otp';
		startResendCooldown();
	}

	async function handleVerifyOtp() {
		if (!otpComplete || loading || !supabase) return;
		resetError();
		loading = true;

		const { data, error: verifyError } = await supabase.auth.verifyOtp({
			email,
			token: otpToken,
			type: 'email'
		});

		if (verifyError) {
			if (verifyError.message?.includes('expired')) {
				error = 'Kode OTP kadaluarsa. Kirim ulang.';
			} else {
				error = 'Kode OTP tidak valid.';
			}
			otpDigits = ['', '', '', '', '', ''];
			loading = false;
			return;
		}

		if (data?.session) {
			window.location.href = '/dashboard';
		}
	}

	function handleOtpInput(index: number, e: Event) {
		const target = e.target as HTMLInputElement;
		const val = target.value.replace(/\D/g, '');
		if (val.length > 1) {
			target.value = val[val.length - 1];
		}
		otpDigits[index] = target.value.slice(-1);
		if (target.value && index < 5) {
			const next = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
			next?.focus();
		}
		if (otpDigits.join('').length === 6 && index === 5) {
			setTimeout(() => handleVerifyOtp(), 100);
		}
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			const prev = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
			prev?.focus();
		}
	}

	function resetCaptcha() {
		if (turnstileWidgetId && window.turnstile) {
			window.turnstile.reset(turnstileWidgetId);
		}
		captchaToken = '';
	}

	function startResendCooldown() {
		resendCooldown = 30;
		const timer = setInterval(() => {
			resendCooldown--;
			if (resendCooldown <= 0) {
				clearInterval(timer);
				resendCooldown = 0;
			}
		}, 1000);
	}

	async function handleResend() {
		if (!canResend) return;
		resetCaptcha();
		await new Promise(r => setTimeout(r, 100));
		handleSendOtp();
	}

	async function handleGoogleLogin() {
		if (loading || !supabase) return;
		resetError();
		loading = true;
		const { error: oauthError } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
		if (oauthError) {
			error = 'Gagal login dengan Google. Periksa koneksi.';
			loading = false;
		}
	}

	function handleBack() {
		step = 'email';
		otpDigits = ['', '', '', '', '', ''];
		error = '';
		resetCaptcha();
	}
</script>

<svelte:head><title>Login · MemFinance</title></svelte:head>


<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--canvas)] p-4">
	<div class="relative w-full max-w-md" transition:fade={{ duration: 180 }}>
		<div class="mb-7 text-center" transition:fly={{ y: -8, duration: 220 }}>
			<a href={resolve('/')} class="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-[var(--text-primary)]">
				<span class="flex h-10 w-10 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 19V7l7-3 7 3v12l-7 3-7-3Z" /><path d="M8 9h8M8 13h5" /></svg>
				</span>
				MemFinance
			</a>
			<p class="mt-2 font-mono text-xs text-[var(--text-secondary)]">Sistem Pencatatan Keuangan Pribadi</p>
		</div>

		{#if !supabaseConfigured}
			<div class="retro-card space-y-3 p-6 text-center bg-[var(--surface-1)]">
				<p class="font-bold text-[var(--text-primary)]">Autentikasi Belum Dikonfigurasi</p>
				<p class="text-xs text-[var(--text-secondary)]">Gunakan mode lokal tanpa koneksi Supabase.</p>
				<a
					href={resolve('/dashboard')}
					class="retro-btn-push mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]"
				>
					Lanjut ke Dashboard (Mode Lokal) →
				</a>
			</div>
		{:else}

		<div class="retro-card space-y-5 p-5 sm:p-7 bg-[var(--surface-1)]">
			<div>
				<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-text)]">
					<span class="inline-block size-1.5 rounded-full bg-[var(--brand-fill)]"></span>
					Autentikasi Akun
				</div>
				<h1 class="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">Selamat Datang</h1>
				<p class="mt-0.5 text-xs text-[var(--text-secondary)]">Pilih cara yang paling nyaman untuk masuk.</p>
			</div>

			{#if error}
				<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50 p-3 font-mono text-xs font-bold text-danger-800 shadow-[var(--shadow-retro-sm)] dark:bg-danger-950/40 dark:text-danger-300" transition:fade>
					<div class="flex items-start gap-2">
						<svg class="h-4 w-4 shrink-0 text-danger-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span>{error}</span>
					</div>
				</div>
			{/if}

			<button
				onclick={handleGoogleLogin}
				disabled={loading}
				class="retro-btn-push flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-2.5 font-sans text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] disabled:opacity-50"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
				{loading ? 'Memproses...' : 'Login dengan Google'}
			</button>

			{#if data?.canBypass}
				<a
					href={resolve('/dashboard')}
					class="retro-btn-push flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]"
				>
					<svg class="size-4 shrink-0 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
					Bypass Login (Lanjut ke Dashboard)
				</a>
			{/if}

			<div class="flex items-center gap-3">
				<hr class="flex-1 border-t-[1.5px] border-[var(--border-subtle)]" />
				<span class="font-mono text-xs uppercase font-bold text-[var(--text-tertiary)]">atau</span>
				<hr class="flex-1 border-t-[1.5px] border-[var(--border-subtle)]" />
			</div>

			{#if step === 'email'}
				<div class="space-y-3">
					<div>
						<label for="login-email" class="mb-1 block font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Alamat Email</label>
						<input
							id="login-email"
							type="email"
							placeholder="anda@email.com"
							bind:value={email}
							oninput={resetError}
							class="min-h-11 w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-[var(--shadow-retro-sm)] focus:outline-none focus:ring-2 focus:ring-primary-500/20"
						/>
					</div>
					<div id="turnstile-widget" class="flex justify-center"></div>
					{#if error}
						<p class="text-xs text-red-500" transition:fade>{error}</p>
					{/if}
					<Button variant="primary" class="w-full" onclick={handleSendOtp} disabled={!emailValid || loading || !turnstileReady} loading={loading}>
						{loading ? 'Mengirim...' : 'Lanjutkan'}
					</Button>
				</div>
			{:else}
				<div class="space-y-4" transition:fly={{ y: 10, duration: 200 }}>
					{#if successMessage}
						<p class="text-sm text-green-600 dark:text-green-400 text-center" transition:fade>{successMessage}</p>
					{/if}
					<div>
						<p id="otp-label" class="mb-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Masukkan 6 digit kode OTP</p>
						<div class="flex justify-center gap-1 sm:gap-2">
								{#each otpDigits as _, i (i)}
								<input
									id="otp-{i}"
									type="text"
									inputmode="numeric"
									maxlength="1"
									value={otpDigits[i]}
									oninput={(e) => handleOtpInput(i, e)}
									onkeydown={(e) => handleOtpKeydown(i, e)}
									aria-label="Digit OTP {i + 1}" aria-describedby="otp-label" class="h-11 w-9 max-w-12 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-center font-mono text-base font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 sm:h-14 sm:w-12 sm:text-lg"
								/>
							{/each}
						</div>
					</div>
					{#if error}
						<p class="text-xs text-red-500 text-center" transition:fade>{error}</p>
					{/if}
					<Button variant="primary" class="w-full" onclick={handleVerifyOtp} disabled={!otpComplete || loading} loading={loading}>
						{loading ? 'Memverifikasi...' : 'Verifikasi'}
					</Button>
					<div class="flex items-center justify-between text-xs">
						<button onclick={handleBack} class="font-mono text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Kembali</button>
						<button
							onclick={handleResend}
							disabled={!canResend}
							class="font-mono text-xs font-bold text-[var(--brand-text)] hover:underline disabled:text-[var(--text-tertiary)] disabled:no-underline disabled:cursor-not-allowed"
						>
							{#if resendCooldown > 0}
								Kirim ulang ({resendCooldown}s)
							{:else}
								Belum terima? Kirim ulang
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
</div>
