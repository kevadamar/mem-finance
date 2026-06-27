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
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={oncancel} role="dialog" aria-modal="true">
		<div class="fixed inset-0 bg-black/40" />
		<div class="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3">
				<span class="text-2xl">{format === 'csv' ? '📄' : '🗄️'}</span>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
				<button onclick={oncancel} disabled={importing} class="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
					Batal
				</button>
				<button onclick={onconfirm} disabled={importing} class="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
					{importing ? 'Mengimpor...' : 'Konfirmasi Import'}
				</button>
			</div>
		</div>
	</div>
{/if}
