<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { fly } from 'svelte/transition';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { createBrowserClient } from '@supabase/ssr';
	import Button from '$lib/components/ui/Button.svelte';

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

	let supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

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
		if (!emailValid || loading) return;
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
		if (!otpComplete || loading) return;
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
		if (loading) return;
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

<svelte:head><title>Login — MemFinance</title></svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
	<div class="w-full max-w-md" transition:fade={{ duration: 200 }}>
		<div class="text-center mb-8" transition:fly={{ y: -10, duration: 300 }}>
			<h1 class="text-2xl font-bold text-primary-600 dark:text-primary-400">MemFinance</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola keuangan pribadi Anda</p>
		</div>

		<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">
			<button
				onclick={handleGoogleLogin}
				disabled={loading}
				class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
				{loading ? 'Memproses...' : 'Login dengan Google'}
			</button>

			<div class="flex items-center gap-3">
				<hr class="flex-1 border-gray-200 dark:border-gray-700" />
				<span class="text-xs text-gray-400">atau</span>
				<hr class="flex-1 border-gray-200 dark:border-gray-700" />
			</div>

			{#if step === 'email'}
				<div class="space-y-3">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
						<input
							type="email"
							placeholder="anda@email.com"
							bind:value={email}
							oninput={resetError}
							class="w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
					</div>
					<div id="turnstile-widget" class="flex justify-center"></div>
					{#if error}
						<p class="text-xs text-red-500" transition:fade>{{error}}</p>
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
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">Masukkan 6 digit kode OTP</label>
						<div class="flex justify-center gap-2">
							{#each otpDigits as _, i}
								<input
									id="otp-{i}"
									type="text"
									inputmode="numeric"
									maxlength="1"
									value={otpDigits[i]}
									oninput={(e) => handleOtpInput(i, e)}
									onkeydown={(e) => handleOtpKeydown(i, e)}
									class="w-12 h-14 text-center text-xl font-bold rounded-lg border text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
						<button onclick={handleBack} class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Kembali</button>
						<button
							onclick={handleResend}
							disabled={!canResend}
							class="text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
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
	</div>
</div>
