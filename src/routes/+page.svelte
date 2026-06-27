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

<div class="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-white dark:from-gray-950 dark:to-gray-900">
	<header class="flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto w-full">
		<span class="text-lg font-bold text-primary-600 dark:text-primary-400">MemFinance</span>
		<div class="flex items-center gap-3">
			<a href="/dashboard"
				class="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Masuk</a>
			<button onclick={toggleDark}
				class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-lg" aria-label="Toggle dark mode">
				{dark ? '☀️' : '🌙'}
			</button>
		</div>
	</header>

	<main class="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-3xl mx-auto w-full">
		<div class="text-5xl md:text-7xl mb-6">💰</div>
		<h1 class="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
			Kelola Keuangan<br class="sm:hidden"> dengan Mudah
		</h1>
		<p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl mb-10">
			Catat pemasukan dan pengeluaran, lihat visualisasi data, dan biarkan AI membantu mencatat secara otomatis — semua offline, semua gratis.
		</p>
		<a href="/dashboard"
			class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/25">
			Mulai Sekarang
			<span class="text-xl">→</span>
		</a>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-20 w-full max-w-3xl">
			<div class="bg-white/70 dark:bg-gray-800/50 backdrop-blur rounded-2xl p-5 md:p-6 text-left border border-gray-200/50 dark:border-gray-700/50">
				<div class="text-2xl mb-3">📊</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">Dashboard & Grafik</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">Lihat ringkasan keuangan dan pie chart pengeluaran per kategori.</p>
			</div>
			<div class="bg-white/70 dark:bg-gray-800/50 backdrop-blur rounded-2xl p-5 md:p-6 text-left border border-gray-200/50 dark:border-gray-700/50">
				<div class="text-2xl mb-3">🤖</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">AI Chatbot</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">Catat transaksi cukup dengan chat. "Grab 35rb" — otomatis tersimpan.</p>
			</div>
			<div class="bg-white/70 dark:bg-gray-800/50 backdrop-blur rounded-2xl p-5 md:p-6 text-left border border-gray-200/50 dark:border-gray-700/50">
				<div class="text-2xl mb-3">📱</div>
				<h3 class="font-semibold text-gray-900 dark:text-white mb-1">Offline First</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">Bekerja tanpa internet. Data tetap aman di perangkat Anda.</p>
			</div>
		</div>
	</main>

	<footer class="text-center py-6 text-xs text-gray-400 dark:text-gray-600">
		MemFinance v0.0.1 &mdash; Kelola Keuangan Pribadi
	</footer>
</div>
