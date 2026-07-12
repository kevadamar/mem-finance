<script lang="ts">
	let dark = $state(false);

	$effect(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleDark() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('memfinance_dark_mode', String(dark));
	}

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
	<title>MemFinance — Catat Keuangan Pribadi dengan Lebih Tenang</title>
	<meta name="description" content="MemFinance membantu Anda mencatat transaksi, memantau anggaran, dan memahami kebiasaan keuangan dengan sederhana, privat, dan tetap berguna saat offline." />
	<meta name="robots" content="index, follow" />
	<meta name="theme-color" content="#0f766e" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="MemFinance" />
	<meta property="og:locale" content="id_ID" />
	<meta property="og:title" content="MemFinance — Keuangan lebih jelas, keputusan lebih tenang" />
	<meta property="og:description" content="Catat transaksi, pantau anggaran, dan pahami kebiasaan keuangan Anda dengan MemFinance." />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="MemFinance — Keuangan lebih jelas, keputusan lebih tenang" />
	<meta name="twitter:description" content="Catat transaksi, pantau anggaran, dan pahami kebiasaan keuangan Anda dengan MemFinance." />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-[#f7faf9] text-[var(--text-primary)] dark:bg-gray-950">
	<a class="skip-link" href="#konten-utama">Lewati ke konten utama</a>

	<header class="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Navigasi utama">
		<a href="/" class="inline-flex items-center gap-2.5 rounded-xl font-extrabold tracking-tight text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-white" aria-label="MemFinance, beranda">
			<span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/25" aria-hidden="true">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 19V7l7-3 7 3v12l-7 3-7-3Z" /><path d="M8 9h8M8 13h5" /></svg>
			</span>
			<span>MemFinance</span>
		</a>
		<div class="flex items-center gap-1.5 sm:gap-2">
			<a href="/dashboard" class="hidden rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none transition-colors hover:bg-white hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-200 dark:hover:bg-gray-900 sm:inline-flex">Masuk</a>
			<button onclick={toggleDark} class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/70 text-gray-600 outline-none transition hover:border-primary-200 hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:border-primary-800 dark:hover:text-primary-300" aria-label={dark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}>
				<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d={dark ? 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' : 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11Z'} /></svg>
			</button>
			<a href="/dashboard" class="inline-flex min-h-10 items-center rounded-xl bg-primary-600 px-3.5 text-sm font-extrabold text-white shadow-md shadow-primary-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transform-none sm:px-4">Mulai</a>
		</div>
	</header>

	<main id="konten-utama">
		<section class="relative isolate mx-auto max-w-7xl px-4 pb-[4.5rem] pt-11 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-20">
			<div class="pointer-events-none absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-200/50 blur-3xl dark:bg-primary-900/25"></div>
			<div class="pointer-events-none absolute right-0 top-20 -z-10 h-72 w-72 rounded-full bg-teal-100/80 blur-3xl dark:bg-teal-950/30"></div>
			<div class="grid items-center gap-12 lg:grid-cols-[1fr_.92fr] lg:gap-16">
				<div class="animate-enter text-center lg:text-left">
					<p class="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-primary-800 shadow-sm dark:border-primary-900 dark:bg-primary-950/50 dark:text-primary-200"><span class="h-1.5 w-1.5 rounded-full bg-primary-500"></span>KEUANGAN PRIBADI, TANPA RIBET</p>
					<h1 class="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">Berhenti menebak. <span class="text-primary-700 dark:text-primary-400">Mulai merasa tenang.</span></h1>
					<p class="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg sm:leading-8 lg:mx-0">MemFinance membuat catatan harian, anggaran, dan pola pengeluaran terasa mudah dimengerti—agar uang Anda bisa mendukung hidup yang Anda inginkan.</p>
					<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
						<a href="/dashboard" class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 text-sm font-extrabold text-white shadow-xl shadow-primary-600/25 outline-none transition hover:-translate-y-0.5 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transform-none">Mulai mengatur keuangan <span class="text-lg leading-none" aria-hidden="true">→</span></a>
						<a href="#cara-kerja" class="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-6 text-sm font-extrabold text-gray-700 outline-none transition hover:border-primary-300 hover:text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:border-primary-700 dark:hover:text-primary-300">Lihat cara kerjanya <span aria-hidden="true">↓</span></a>
					</div>
					<div class="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-gray-500 dark:text-gray-400 lg:justify-start"><span class="inline-flex items-center gap-1.5"><span class="check">✓</span> Mulai gratis</span><span class="inline-flex items-center gap-1.5"><span class="check">✓</span> Tetap berguna offline</span><span class="inline-flex items-center gap-1.5"><span class="check">✓</span> Data dapat diekspor</span></div>
				</div>

				<div class="animate-dashboard relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Contoh ringkasan keuangan MemFinance">
					<div class="absolute -inset-4 -z-10 rounded-[2.5rem] bg-primary-300/20 blur-2xl dark:bg-primary-700/15"></div>
					<div class="rounded-[2rem] border border-white/80 bg-white/95 p-4 shadow-2xl shadow-primary-950/10 ring-1 ring-gray-950/5 dark:border-gray-800 dark:bg-gray-900/95 dark:shadow-black/35 dark:ring-white/5 sm:p-5">
						<div class="flex items-center justify-between"><div><p class="text-xs font-bold text-gray-500">Selamat pagi, Dita</p><p class="mt-1 text-xl font-extrabold tracking-tight text-gray-950 dark:text-white">Juli berjalan baik.</p></div><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5" /></svg></span></div>
						<div class="mt-5 rounded-2xl bg-gray-950 p-5 text-white dark:bg-primary-950"><p class="text-xs font-semibold text-gray-400 dark:text-primary-200">Sisa untuk bulan ini</p><p class="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">Rp 3.240.000</p><div class="mt-4 flex items-center gap-2 text-xs font-bold text-primary-200"><span class="rounded-full bg-white/10 px-2 py-1">+12% dari bulan lalu</span><span>terkendali</span></div></div>
						<div class="mt-4 grid grid-cols-2 gap-3"><div class="rounded-2xl border border-gray-100 p-3.5 dark:border-gray-800"><p class="text-[11px] font-bold text-gray-500">Pemasukan</p><p class="mt-1 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">Rp 5.000.000</p></div><div class="rounded-2xl border border-gray-100 p-3.5 dark:border-gray-800"><p class="text-[11px] font-bold text-gray-500">Pengeluaran</p><p class="mt-1 text-sm font-extrabold text-gray-950 dark:text-white">Rp 1.760.000</p></div></div>
						<div class="mt-4 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"><div class="flex items-center justify-between"><div><p class="text-sm font-extrabold text-gray-950 dark:text-white">Anggaran makan</p><p class="mt-0.5 text-xs text-gray-500">Rp 720.000 dari Rp 1.000.000</p></div><span class="text-sm font-extrabold text-amber-600 dark:text-amber-400">72%</span></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div class="h-full w-[72%] rounded-full bg-amber-400"></div></div></div>
						<div class="mt-4 flex items-center gap-3 rounded-2xl bg-primary-50/70 p-3.5 dark:bg-primary-950/40"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm dark:bg-primary-900 dark:text-primary-200" aria-hidden="true">✦</span><p class="flex-1 text-xs font-semibold leading-5 text-primary-900 dark:text-primary-100">Anda masih punya ruang untuk menikmati akhir pekan.</p></div>
					</div>
				</div>
			</div>
		</section>

		<section class="border-y border-gray-200/80 bg-white/70 px-4 py-12 dark:border-gray-800 dark:bg-gray-900/35 sm:px-6 lg:px-8">
			<div class="mx-auto grid max-w-7xl gap-7 text-center sm:grid-cols-3 sm:gap-4"><div><p class="text-2xl font-extrabold tracking-tight text-primary-700 dark:text-primary-400">Sekejap</p><p class="mt-1 text-sm text-gray-600 dark:text-gray-400">untuk mencatat transaksi</p></div><div><p class="text-2xl font-extrabold tracking-tight text-primary-700 dark:text-primary-400">Satu tempat</p><p class="mt-1 text-sm text-gray-600 dark:text-gray-400">untuk melihat gambaran utuh</p></div><div><p class="text-2xl font-extrabold tracking-tight text-primary-700 dark:text-primary-400">Di tangan Anda</p><p class="mt-1 text-sm text-gray-600 dark:text-gray-400">untuk data dan keputusan</p></div></div>
		</section>

		<section id="cara-kerja" class="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
			<div class="max-w-2xl"><p class="eyebrow">CARA KERJA</p><h2 class="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">Ritual kecil yang membuat gambaran besar terasa jelas.</h2><p class="mt-4 max-w-xl leading-7 text-gray-600 dark:text-gray-400">Tidak ada istilah yang mengintimidasi. Hanya langkah yang membantu Anda membangun kebiasaan baik, pelan-pelan.</p></div>
			<div class="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
				{#each features as feature, i}
					<article class="feature-card group rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900" style={`--delay: ${i * 90}ms`}>
						<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true">
							{#if feature.icon === 'plus'}<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>{:else if feature.icon === 'chart'}<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></svg>{:else}<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>{/if}
						</span>
						<p class="mt-7 text-xs font-extrabold tracking-[.16em] text-primary-700 dark:text-primary-400">0{i + 1}</p><h3 class="mt-2 text-lg font-extrabold tracking-tight text-gray-950 dark:text-white">{feature.title}</h3><p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{feature.description}</p>
					</article>
				{/each}
			</div>
		</section>

		<section class="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
			<div class="grid overflow-hidden rounded-[2rem] bg-primary-700 text-white lg:grid-cols-[.82fr_1.18fr]">
				<div class="p-8 sm:p-10 lg:p-12"><p class="eyebrow text-primary-100">PRIVAT SECARA DESAIN</p><h2 class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Keuangan adalah hal pribadi. Kami memperlakukannya begitu.</h2><p class="mt-5 max-w-md leading-7 text-primary-100">MemFinance dirancang untuk tetap berguna tanpa koneksi dan memberi Anda kendali atas data melalui opsi ekspor.</p><a href="/dashboard" class="mt-8 inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-sm font-extrabold text-primary-800 outline-none transition hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700">Buka MemFinance <span class="ml-2" aria-hidden="true">→</span></a></div>
				<div class="relative min-h-62 bg-primary-800/50 p-8 sm:p-10 lg:p-12"><div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 18px 18px;"></div><div class="relative mx-auto max-w-md rounded-3xl border border-white/15 bg-primary-950/40 p-5 backdrop-blur"><div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" aria-hidden="true"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg></span><div><p class="font-extrabold">Kendali tetap di tangan Anda</p><p class="mt-0.5 text-xs text-primary-200">Ekspor saat Anda membutuhkannya</p></div></div><div class="mt-6 space-y-3"><div class="h-2 w-full rounded-full bg-white/10"></div><div class="h-2 w-4/5 rounded-full bg-white/10"></div><div class="h-2 w-3/5 rounded-full bg-white/10"></div></div><div class="mt-6 rounded-2xl bg-emerald-400/15 px-4 py-3 text-sm font-bold text-emerald-100">✓ Siap digunakan, bahkan offline</div></div></div>
			</div>
		</section>

		<section class="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8"><div class="text-center"><p class="eyebrow">PERTANYAAN SINGKAT</p><h2 class="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white">Yang perlu Anda tahu.</h2></div><div class="mt-8 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-5 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"><details class="group py-4"><summary class="cursor-pointer list-none pr-8 text-sm font-extrabold text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-white">Apakah MemFinance gratis?<span class="float-right text-primary-600 transition group-open:rotate-45" aria-hidden="true">+</span></summary><p class="pt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">Anda dapat mulai menggunakan MemFinance tanpa kartu kredit.</p></details><details class="group py-4"><summary class="cursor-pointer list-none pr-8 text-sm font-extrabold text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-white">Dapatkah saya menggunakannya tanpa internet?<span class="float-right text-primary-600 transition group-open:rotate-45" aria-hidden="true">+</span></summary><p class="pt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">Ya. MemFinance dirancang agar catatan keuangan tetap dapat digunakan saat koneksi tidak tersedia.</p></details><details class="group py-4"><summary class="cursor-pointer list-none pr-8 text-sm font-extrabold text-gray-950 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-white">Apakah data saya bisa dibawa pergi?<span class="float-right text-primary-600 transition group-open:rotate-45" aria-hidden="true">+</span></summary><p class="pt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">Ya. Anda dapat mengekspor data dari pengaturan aplikasi kapan pun diperlukan.</p></details></div></section>
	</main>

	<footer class="border-t border-gray-200 bg-white/60 px-4 py-8 dark:border-gray-800 dark:bg-gray-900/40 sm:px-6 lg:px-8"><div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-gray-500 sm:flex-row sm:text-left dark:text-gray-400"><p>MemFinance — Kendali keuangan, di tangan Anda.</p><a href="/dashboard" class="font-bold text-primary-700 outline-none hover:text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400">Mulai gratis <span aria-hidden="true">→</span></a></div></footer>
</div>

<style>
	.skip-link { position: fixed; z-index: 50; top: 0.75rem; left: 50%; transform: translate(-50%, -160%); border-radius: 0.75rem; background: #0f766e; padding: 0.6rem 1rem; color: white; font-size: 0.875rem; font-weight: 700; transition: transform 150ms ease; }
	.skip-link:focus { transform: translate(-50%, 0); outline: 2px solid white; outline-offset: 2px; }
	.eyebrow { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.14em; color: #0f766e; }
	.check { display: inline-flex; height: 1rem; width: 1rem; align-items: center; justify-content: center; border-radius: 9999px; background: #ccfbf1; color: #0f766e; font-size: 0.625rem; }
	.animate-enter { animation: rise 600ms cubic-bezier(.2,.8,.2,1) both; }
	.animate-dashboard { animation: rise 700ms 100ms cubic-bezier(.2,.8,.2,1) both, float 6s 900ms ease-in-out infinite; }
	.feature-card { animation: rise 600ms var(--delay) cubic-bezier(.2,.8,.2,1) both; transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
	.feature-card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, #0f766e 35%, transparent); box-shadow: 0 16px 30px rgba(15, 118, 110, 0.09); }
	@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
	@media (prefers-reduced-motion: reduce) { .animate-enter, .animate-dashboard, .feature-card { animation: none; } .feature-card, .feature-card:hover { transition: none; transform: none; } .skip-link { transition: none; } }
</style>
