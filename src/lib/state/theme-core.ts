export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'memfinance_theme';
export const LEGACY_THEME_STORAGE_KEY = 'memfinance_dark_mode';

export function parseThemePreference(stored: string | null | undefined): ThemePreference {
	if (!stored) return 'system';
	const trimmed = stored.trim();
	if (trimmed === 'dark') return 'dark';
	if (trimmed === 'light') return 'light';
	if (trimmed === 'system') return 'system';
	// Backward compatibility with boolean strings from memfinance_dark_mode
	if (trimmed === 'true') return 'dark';
	if (trimmed === 'false') return 'light';
	return 'system';
}

export function resolveEffectiveTheme(
	preference: ThemePreference,
	systemPrefersDark: boolean
): EffectiveTheme {
	if (preference === 'dark') return 'dark';
	if (preference === 'light') return 'light';
	return systemPrefersDark ? 'dark' : 'light';
}

export function getNextThemePreference(current: ThemePreference): ThemePreference {
	if (current === 'light') return 'dark';
	if (current === 'dark') return 'system';
	return 'light';
}

export function applyThemeToDocument(
	effectiveTheme: EffectiveTheme,
	doc: Document = typeof document !== 'undefined' ? document : ({} as Document)
): void {
	if (!doc || !doc.documentElement) return;
	const isDark = effectiveTheme === 'dark';
	const classList = doc.documentElement.classList;
	if (classList) {
		classList.toggle('dark', isDark);
		classList.toggle('light', !isDark);
	}
	if (doc.documentElement.style) {
		doc.documentElement.style.colorScheme = effectiveTheme;
	}

	const metaThemeColor = doc.querySelector?.('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute('content', isDark ? '#121514' : '#0f766e');
	}
}
