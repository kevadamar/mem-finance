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
		<div class="relative w-full max-w-lg space-y-4 rounded-xl border-[1.5px] border-[var(--border-strong)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-retro)] sm:p-6">
			<div class="flex items-center gap-3">
				<span class="flex h-10 w-10 items-center justify-center rounded-lg border-[1.5px] border-[var(--border-strong)] bg-emerald-50 font-mono text-base font-black text-emerald-800 shadow-[var(--shadow-retro-sm)] dark:bg-emerald-950 dark:text-emerald-300" aria-hidden="true">✓</span>
				<div>
					<div class="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--brand-primary)]">
						Laporan Impor
					</div>
					<h2 id="import-report-title" class="text-base sm:text-lg font-black text-[var(--text-primary)]">Hasil Impor {format.toUpperCase()}</h2>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-2.5 sm:gap-3 font-mono">
				<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 sm:p-3 text-center shadow-[1px_1px_0_var(--shadow-retro)]">
					<p class="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{report.successCount}</p>
					<p class="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Berhasil</p>
				</div>
				<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-amber-50/60 dark:bg-amber-950/30 p-2.5 sm:p-3 text-center shadow-[1px_1px_0_var(--shadow-retro)]">
					<p class="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">{report.skipCount}</p>
					<p class="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Dilewati</p>
				</div>
				<div class="rounded-lg border-[1.5px] border-[var(--border-strong)] bg-danger-50/60 dark:bg-danger-950/30 p-2.5 sm:p-3 text-center shadow-[1px_1px_0_var(--shadow-retro)]">
					<p class="text-xl sm:text-2xl font-black text-danger-700 dark:text-danger-300">{report.errorCount}</p>
					<p class="text-[11px] font-bold uppercase tracking-wider text-danger-800 dark:text-danger-400">Gagal</p>
				</div>
			</div>

			{#if report.details.length > 0}
				<div class="max-h-40 overflow-y-auto space-y-1 font-mono text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
					{#each report.details as d (`${d.entity ?? ''}-${d.id ?? ''}-${d.reason}`)}
						<div class="flex gap-2 text-[var(--text-secondary)]">
							<span class="text-danger-500">•</span>
							<span>{d.entity ? `${d.entity}: ` : ''}{d.reason}{d.id ? ` (${d.id.slice(0, 8)}...)` : ''}</span>
						</div>
					{/each}
				</div>
			{/if}

			<button onclick={onclose} class="retro-btn-push min-h-11 w-full rounded-lg border-[1.5px] border-[var(--border-strong)] bg-[var(--brand-primary)] px-4 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[var(--shadow-retro-sm)]">
				Tutup Laporan
			</button>
		</div>
	</div>
{/if}
