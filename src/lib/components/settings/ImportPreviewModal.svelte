<script lang="ts">
	let {
		open, format, summary, importing,
		onconfirm, oncancel
	}: {
		open: boolean;
		format: 'csv' | 'sqlite';
		summary: { entityCounts: Record<string, number>; dateRange?: { start: string; end: string }; totalAmount?: number; sampleRows?: Record<string, unknown>[] };
		importing: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	function formatRupiah(n: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="import-preview-title" tabindex="-1">
		<button class="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm" onclick={oncancel} aria-label="Tutup preview import"></button>
		<div class="relative w-full max-w-lg space-y-4 rounded-t-3xl border border-gray-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 dark:border-gray-800 dark:bg-gray-900">
			<div class="flex items-center gap-3">
				<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300" aria-hidden="true">{format === 'csv' ? 'CSV' : 'DB'}</span>
				<h2 id="import-preview-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">
					Preview Import {format === 'csv' ? 'CSV' : 'SQLite'}
				</h2>
			</div>

			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-gray-500">Total record</span>
					<span class="font-medium text-gray-900 dark:text-gray-100">
						{Object.values(summary.entityCounts).reduce((a, b) => (a as number) + (b as number), 0)} record
					</span>
				</div>
				{#each Object.entries(summary.entityCounts) as [entity, count]}
					<div class="flex justify-between pl-4">
						<span class="text-gray-400 capitalize">{entity}</span>
						<span class="text-gray-700 dark:text-gray-300">{count}</span>
					</div>
				{/each}
				{#if summary.dateRange}
					<div class="flex justify-between">
						<span class="text-gray-500">Rentang tanggal</span>
						<span class="text-gray-700 dark:text-gray-300">{summary.dateRange.start} – {summary.dateRange.end}</span>
					</div>
				{/if}
				{#if summary.totalAmount !== undefined}
					<div class="flex justify-between">
						<span class="text-gray-500">Total jumlah</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">{formatRupiah(summary.totalAmount)}</span>
					</div>
				{/if}
			</div>

			<div class="flex gap-3 pt-2">
				<button onclick={oncancel} disabled={importing} class="min-h-11 flex-1 rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
					Batal
				</button>
				<button onclick={onconfirm} disabled={importing} class="min-h-11 flex-1 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50">
					{importing ? 'Mengimpor...' : 'Konfirmasi Import'}
				</button>
			</div>
		</div>
	</div>
{/if}
