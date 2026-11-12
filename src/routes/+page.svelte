<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { theme } from '$lib/state/theme.svelte';

	onMount(() => {
		theme.init();
	});

	const features = [
		{
			title: 'Catat tanpa berpikir dua kali',
			description: 'Tambah pemasukan atau pengeluaran dalam beberapa ketukan. Kategori menjaga catatan tetap rapi sejak awal.',
			icon: 'plus'
		},
		{
			title: 'Pahami pola, bukan sekadar angka',
			description: 'Ringkasan yang tenang dan mudah dipindai membantu Anda melihat kebiasaan sebelum mengambil keputusan.',
			icon: 'chart'
		},
		{
			title: 'Data tetap milik Anda',
			description: 'Gunakan saat offline, ekspor kapan saja, dan atur MemFinance sesuai ritme hidup Anda.',
			icon: 'shield'
		}
	];
</script>

<svelte:head>
	<title>MemFinance · Catat Keuangan Pribadi dengan Lebih Tenang</title>
	<meta name="description" content="MemFinance membantu Anda mencatat transaksi, memantau anggaran, dan memahami kebiasaan keuangan dengan sederhana, privat, dan tetap berguna saat offline." />
	<meta name="robots" content="index, follow" />
	<meta name="theme-color" content={theme.isDark ? '#121514' : '#0f766e'} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="MemFinance" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content="MemFinance · Keuangan lebih jelas, keputusan lebih tenang" />
	<meta property="og:description" content="Catat transaksi, pantau anggaran, dan pahami kebiasaan keuangan Anda dengan MemFinance." />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="MemFinance · Keuangan lebih jelas, keputusan lebih tenang" />
	<meta name="twitter:description" content="Catat transaksi, pantau anggaran, dan pahami kebiasaan keuangan Anda dengan MemFinance." />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--text-primary)]">
	<a class="skip-link" href="#konten-utama">Lewati ke konten utama</a>

	<header class="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Navigasi utama">
		<a href={resolve('/')} class="inline-flex items-center gap-2.5 rounded-xl font-extrabold tracking-tight text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label="MemFinance, beranda">
			<span class="flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 19V7l7-3 7 3v12l-7 3-7-3Z" /><path d="M8 9h8M8 13h5" /></svg>
			</span>
			<span class="text-xl font-black">MemFinance</span>
		</a>
		<div class="flex items-center gap-2">
			<button
				onclick={() => theme.toggleDark()}
				class="retro-btn-push flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-secondary)] shadow-[var(--shadow-retro-sm)] hover:text-[var(--text-primary)]"
				aria-label={theme.isDark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
			>
				<svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d={theme.isDark ? 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' : 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11Z'} /></svg>
			</button>
			<a href={resolve('/login')} class="retro-btn-push inline-flex min-h-10 items-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-4 text-sm font-mono font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]">Masuk</a>
		</div>
	</header>

	<main id="konten-utama">
		<section class="relative isolate mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-28">
			<div class="grid items-center gap-12 lg:grid-cols-[1fr_.92fr] lg:gap-16">
				<div class="animate-enter text-center lg:text-left">
					<p class="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)] shadow-[var(--shadow-retro-sm)]">
						<span class="h-1.5 w-1.5 rounded-full bg-[var(--brand-fill)]"></span>KEUANGAN PRIBADI, TANPA RIBET
					</p>
					<h1 class="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
						Berhenti menebak. <span class="text-[var(--brand-text)]">Mulai merasa tenang.</span>
					</h1>
					<p class="mx-auto mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8 lg:mx-0">
						MemFinance membuat catatan harian, anggaran, dan pola pengeluaran terasa mudah dimengerti seperti buku kas meja yang rapi.
					</p>
					<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
						<a href={resolve('/login')} class="retro-btn-push inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-6 font-mono text-sm font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro)]">
							Mulai gratis <span class="arrow text-lg leading-none" aria-hidden="true">→</span>
						</a>
						<a href="#cara-kerja" class="retro-btn-push inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-6 font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]">
							Lihat cara kerjanya <span aria-hidden="true">↓</span>
						</a>
					</div>
					<div class="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 font-mono text-xs font-bold text-[var(--text-secondary)] lg:justify-start">
						<span class="inline-flex items-center gap-1.5">✓ Mulai gratis</span>
						<span class="inline-flex items-center gap-1.5">✓ Tetap berguna offline</span>
						<span class="inline-flex items-center gap-1.5">✓ Data dapat diekspor</span>
					</div>
				</div>

				<div class="animate-dashboard relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Contoh ringkasan keuangan MemFinance">
					<div class="rounded-2xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-4 sm:p-5 shadow-[var(--shadow-retro-lg)]">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Buku Kas</p>
								<p class="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">Ringkasan Bulan Berjalan</p>
							</div>
							<span class="grid size-9 place-items-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] font-mono text-xs font-bold text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
								Rp
							</span>
						</div>
						<!-- Saldo LCD Card -->
						<div class="mt-5 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-retro-sm)]">
							<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sisa Saldo Kas</p>
							<p class="mt-1 font-mono text-3xl font-black tracking-tight text-[var(--text-primary)] tabular-nums">Rp 3.240.000</p>
							<div class="mt-3 flex items-center gap-2 font-mono text-xs font-bold text-[var(--income-fg)]">
								<span class="rounded border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">+12% dari bulan lalu</span>
								<span>terkendali</span>
							</div>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-3">
							<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-3 shadow-[var(--shadow-retro-sm)]">
								<p class="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Kas Masuk</p>
								<p class="mt-1 font-mono text-sm sm:text-base font-black text-[var(--income-fg)] tabular-nums">+Rp 5.000.000</p>
							</div>
							<div class="rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-3 shadow-[var(--shadow-retro-sm)]">
								<p class="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Kas Keluar</p>
								<p class="mt-1 font-mono text-sm sm:text-base font-black text-[var(--expense-fg)] tabular-nums">-Rp 1.760.000</p>
							</div>
						</div>
						<div class="mt-4 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-3.5 shadow-[var(--shadow-retro-sm)]">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-bold text-[var(--text-primary)]">Anggaran Makan & Minum</p>
									<p class="mt-0.5 font-mono text-xs text-[var(--text-secondary)]">Rp 720.000 dari Rp 1.000.000</p>
								</div>
								<span class="font-mono text-xs font-bold text-[var(--warning-fg)]">72%</span>
							</div>
							<div class="mt-2.5 h-2.5 w-full overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]">
								<div class="budget-progress h-full w-[72%] rounded-full bg-[var(--warning-fg)]"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="border-y-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-10 sm:px-6 lg:px-8">
			<div class="mx-auto grid max-w-7xl gap-6 text-center sm:grid-cols-3 sm:gap-4 font-mono">
				<div>
					<p class="text-2xl font-black text-[var(--brand-text)]">Sekejap</p>
					<p class="mt-1 text-xs font-bold text-[var(--text-secondary)]">untuk mencatat transaksi</p>
				</div>
				<div>
					<p class="text-2xl font-black text-[var(--brand-text)]">Satu Tempat</p>
					<p class="mt-1 text-xs font-bold text-[var(--text-secondary)]">untuk melihat gambaran utuh</p>
				</div>
				<div>
					<p class="text-2xl font-black text-[var(--brand-text)]">Di Tangan Anda</p>
					<p class="mt-1 text-xs font-bold text-[var(--text-secondary)]">untuk data dan keputusan</p>
				</div>
			</div>
		</section>

		<section id="cara-kerja" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
			<div class="max-w-2xl">
				<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)]">CARA KERJA</p>
				<h2 class="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
					Ritual kecil yang membuat gambaran besar terasa jelas.
				</h2>
				<p class="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
					Tidak ada istilah yang mengintimidasi. Hanya langkah yang membantu Anda membangun kebiasaan baik, pelan-pelan.
				</p>
			</div>
			<div class="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
				{#each features as feature, i (feature.icon)}
					<article class="feature-card group rounded-2xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-5 sm:p-6 shadow-[var(--shadow-retro-sm)]" style={`--delay: ${i * 90}ms`}>
						<span class="flex size-11 items-center justify-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-primary)] shadow-[var(--shadow-retro-sm)]" aria-hidden="true">
							{#if feature.icon === 'plus'}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" /></svg>
							{:else if feature.icon === 'chart'}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></svg>
							{:else}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3 5 6v5c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
							{/if}
						</span>
						<p class="mt-5 font-mono text-xs font-bold tracking-widest text-[var(--brand-text)]">0{i + 1}</p>
						<h3 class="mt-1.5 text-base font-bold tracking-tight text-[var(--text-primary)]">{feature.title}</h3>
						<p class="mt-2 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">{feature.description}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
			<div class="rounded-2xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-6 sm:p-8 lg:p-10 shadow-[var(--shadow-retro)]">
				<div class="max-w-xl">
					<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)]">PRIVAT SECARA DESAIN</p>
					<h2 class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">Keuangan adalah hal pribadi. Kami memperlakukannya begitu.</h2>
					<p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">MemFinance dirancang untuk tetap berguna tanpa koneksi dan memberi Anda kendali atas data melalui opsi ekspor CSV dan SQLite.</p>
					<a href={resolve('/login')} class="retro-btn-push mt-6 inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-fill)] px-5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--on-brand)] shadow-[var(--shadow-retro-sm)]">
						Mulai dengan aman <span class="arrow ml-2" aria-hidden="true">→</span>
					</a>
				</div>
			</div>
		</section>

		<section class="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
			<div class="text-center">
				<p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--brand-text)]">PERTANYAAN SINGKAT</p>
				<h2 class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">Yang perlu Anda tahu.</h2>
			</div>
			<div class="mt-6 divide-y-[1.5px] divide-[var(--border-subtle)] rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-5 shadow-[var(--shadow-retro-sm)]">
				<details class="group py-4">
					<summary class="cursor-pointer list-none pr-8 text-sm font-bold text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Apakah MemFinance gratis?<span class="float-right font-mono font-bold text-[var(--brand-text)] transition group-open:rotate-45" aria-hidden="true">+</span></summary>
					<p class="pt-2 text-xs sm:text-sm leading-6 text-[var(--text-secondary)]">Anda dapat mulai menggunakan MemFinance tanpa kartu kredit.</p>
				</details>
				<details class="group py-4">
					<summary class="cursor-pointer list-none pr-8 text-sm font-bold text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Dapatkah saya menggunakannya tanpa internet?<span class="float-right font-mono font-bold text-[var(--brand-text)] transition group-open:rotate-45" aria-hidden="true">+</span></summary>
					<p class="pt-2 text-xs sm:text-sm leading-6 text-[var(--text-secondary)]">Ya. MemFinance dirancang agar catatan keuangan tetap dapat digunakan saat koneksi tidak tersedia.</p>
				</details>
				<details class="group py-4">
					<summary class="cursor-pointer list-none pr-8 text-sm font-bold text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Apakah data saya bisa dibawa pergi?<span class="float-right font-mono font-bold text-[var(--brand-text)] transition group-open:rotate-45" aria-hidden="true">+</span></summary>
					<p class="pt-2 text-xs sm:text-sm leading-6 text-[var(--text-secondary)]">Ya. Anda dapat mengekspor data dalam format JSON, CSV, atau SQLite dari pengaturan aplikasi kapan pun diperlukan.</p>
				</details>
			</div>
		</section>
	</main>

	<footer class="border-t-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-6 sm:px-6 lg:px-8">
		<div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center font-mono text-xs text-[var(--text-secondary)] sm:flex-row sm:text-left">
			<p>MemFinance · Kendali keuangan di tangan Anda.</p>
			<a href={resolve('/login')} class="font-bold text-[var(--brand-text)] hover:underline">Masuk ke MemFinance <span aria-hidden="true">→</span></a>
		</div>
	</footer>
</div>

<style>
	.skip-link { position: fixed; z-index: 50; top: 0.75rem; left: 50%; transform: translate(-50%, -160%); border-radius: 0.5rem; background: var(--brand-fill); padding: 0.6rem 1rem; color: var(--on-brand); font-size: 0.875rem; font-weight: 700; transition: transform 150ms ease; }
	.skip-link:focus { transform: translate(-50%, 0); outline: 2px solid var(--focus-ring); outline-offset: 2px; }
	.animate-enter { animation: rise 400ms cubic-bezier(.2,.8,.2,1) both; }
	.animate-dashboard { animation: rise 500ms 100ms cubic-bezier(.2,.8,.2,1) both; }
	.feature-card { animation: rise 400ms var(--delay) cubic-bezier(.2,.8,.2,1) both; }
	@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
	@media (prefers-reduced-motion: reduce) { .animate-enter, .animate-dashboard, .feature-card { animation: none; } .skip-link { transition: none; } }
</style>
