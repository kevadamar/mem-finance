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
</script>

<div class="min-h-screen overflow-hidden bg-[#f8faf8] text-gray-900 dark:bg-gray-950 dark:text-white">
	<header class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
		<a href="/" class="inline-flex items-center gap-2 font-bold tracking-tight text-gray-950 dark:text-white" aria-label="MemFinance, beranda">
			<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm" aria-hidden="true"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 19V7l7-3 7 3v12l-7 3-7-3Z" /><path d="M8 9h8M8 13h5" /></svg></span>
			MemFinance
		</a>
		<div class="flex items-center gap-3">
			<a href="/dashboard"
				class="rounded-lg px-2 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-gray-300 dark:hover:text-primary-300">Masuk</a>
			<button onclick={toggleDark}
				class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900" aria-label="{dark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d={dark ? 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' : 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.8 6.8 0 0 0 11 11Z'} /></svg>
			</button>
		</div>
	</header>

	<main>
		<section class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
			<div class="absolute -left-32 top-0 -z-10 h-80 w-80 rounded-full bg-primary-100/70 blur-3xl dark:bg-primary-950/40"></div>
			<div class="text-center lg:text-left">
				<p class="inline-flex rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-primary-700 dark:border-primary-900 dark:bg-primary-950/60 dark:text-primary-300">Keuangan pribadi, lebih tenang</p>
				<h1 class="mt-5 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
					Keuangan lebih jelas,<br />keputusan lebih tenang.
				</h1>
				<p class="mx-auto mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300 sm:text-lg lg:mx-0">
					Catat pengeluaran, pahami kebiasaan, dan jaga anggaran—semuanya tersimpan di perangkat Anda, bahkan saat offline.
				</p>
				<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
					<a href="/dashboard" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition-transform hover:-translate-y-0.5 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 motion-reduce:transform-none">Mulai gratis <span aria-hidden="true">→</span></a>
					<a href="#cara-kerja" class="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 text-sm font-bold text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">Lihat cara kerja</a>
				</div>
				<p class="mt-4 text-xs text-gray-500 dark:text-gray-400">Tidak perlu kartu kredit. Tidak membutuhkan kredensial bank.</p>
			</div>
			<div class="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20 sm:p-5">
				<div class="flex items-center justify-between"><div><p class="text-xs font-medium text-gray-500">Sisa bulan ini</p><p class="mt-1 text-2xl font-bold tabular-nums text-gray-950 dark:text-white">Rp 3.240.000</p></div><span class="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">Aman</span></div>
				<div class="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/70"><div class="flex items-end justify-between"><p class="text-sm font-semibold">Anggaran makan</p><p class="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">72%</p></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-full w-[72%] rounded-full bg-amber-500"></div></div><p class="mt-3 text-xs text-gray-500">Rp 720.000 dari Rp 1.000.000</p></div>
				<div class="mt-4 flex items-center gap-3 rounded-2xl border border-gray-100 p-3 dark:border-gray-800"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 font-bold text-red-600 dark:bg-red-950">↓</span><div class="flex-1"><p class="text-sm font-semibold">Makan & Minum</p><p class="text-xs text-gray-500">Kopi sore</p></div><p class="font-bold tabular-nums text-red-600">−Rp 35.000</p></div>
			</div>
		</section>

		<section id="cara-kerja" class="border-y border-gray-200 bg-white/70 px-4 py-14 dark:border-gray-800 dark:bg-gray-900/40 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-6xl"><div class="max-w-xl"><p class="text-sm font-bold text-primary-700 dark:text-primary-300">Dibuat untuk rutinitas Anda</p><h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Sederhana ketika mencatat. Jelas ketika mengevaluasi.</h2></div>
				<div class="mt-8 grid gap-4 md:grid-cols-3">
					{#each [{n:'01',t:'Catat dalam hitungan detik',d:'Tambahkan transaksi secara manual atau cukup tulis dengan bahasa sehari-hari.'},{n:'02',t:'Lihat pola pengeluaran',d:'Ringkasan yang mudah dibaca membantu Anda mengetahui ke mana uang pergi.'},{n:'03',t:'Tetap pegang kendali',d:'Ekspor data kapan saja dan tetap gunakan aplikasi saat koneksi terputus.'}] as item}
						<article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><span class="text-sm font-bold text-primary-600 dark:text-primary-400">{item.n}</span><h3 class="mt-6 font-bold text-gray-950 dark:text-white">{item.t}</h3><p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{item.d}</p></article>
					{/each}
				</div>
			</div>
		</section>
	</main>
	<footer class="mx-auto w-full max-w-6xl px-4 py-7 text-center text-xs text-gray-500 sm:px-6 lg:px-8 dark:text-gray-500">
		MemFinance &mdash; Kendali keuangan, di tangan Anda.
	</footer>
</div>
