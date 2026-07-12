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
	<div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="import-report-title" tabindex="-1">
		<button class="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm" onclick={onclose} aria-label="Tutup hasil import"></button>
		<div class="relative w-full max-w-lg space-y-4 rounded-t-3xl border border-gray-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6 dark:border-gray-800 dark:bg-gray-900">
			<div class="flex items-center gap-3">
				<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-700 dark:bg-green-950 dark:text-green-300" aria-hidden="true">✓</span>
				<h2 id="import-report-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">Hasil import {format.toUpperCase()}</h2>
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

			<button onclick={onclose} class="min-h-11 w-full rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
				Tutup
			</button>
		</div>
	</div>
{/if}
