<script lang="ts">
	let {
		open, format, report, onclose
	}: {
		open: boolean;
		format: 'csv' | 'sqlite';
		report: { successCount: number; skipCount: number; errorCount: number; details: { entity?: string; id?: string; reason: string }[] };
		onclose: () => void;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={onclose} role="dialog" aria-modal="true">
		<div class="fixed inset-0 bg-black/40" />
		<div class="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center gap-3">
				<span class="text-2xl">{format === 'csv' ? '📄' : '🗄️'}</span>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Hasil Import</h2>
			</div>

			<div class="flex gap-4 text-sm">
				<div class="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
					<p class="text-2xl font-bold text-green-600">{report.successCount}</p>
					<p class="text-xs text-green-600">Berhasil</p>
				</div>
				<div class="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
					<p class="text-2xl font-bold text-yellow-600">{report.skipCount}</p>
					<p class="text-xs text-yellow-600">Dilewati</p>
				</div>
				<div class="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
					<p class="text-2xl font-bold text-red-600">{report.errorCount}</p>
					<p class="text-xs text-red-600">Error</p>
				</div>
			</div>

			{#if report.details.length > 0}
				<div class="max-h-40 overflow-y-auto space-y-1 text-xs">
					{#each report.details as d}
						<div class="flex gap-2 text-gray-600 dark:text-gray-400">
							<span class="text-red-400">•</span>
							<span>{d.entity ? `${d.entity}: ` : ''}{d.reason}{d.id ? ` (${d.id.slice(0, 8)}...)` : ''}</span>
						</div>
					{/each}
				</div>
			{/if}

			<button onclick={onclose} class="w-full px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
				Tutup
			</button>
		</div>
	</div>
{/if}
