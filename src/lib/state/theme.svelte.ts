import {
	parseThemePreference,
	resolveEffectiveTheme,
	getNextThemePreference,
	applyThemeToDocument,
	THEME_STORAGE_KEY,
	LEGACY_THEME_STORAGE_KEY,
	type ThemePreference,
	type EffectiveTheme
} from './theme-core';

class ThemeStore {
	preference = $state<ThemePreference>('system');
	systemIsDark = $state(false);

	effectiveTheme = $derived<EffectiveTheme>(
		resolveEffectiveTheme(this.preference, this.systemIsDark)
	);

	isDark = $derived(this.effectiveTheme === 'dark');

	private initialized = false;

	init() {
		if (this.initialized || typeof window === 'undefined') return;
		this.initialized = true;

		// 1. Read stored preference or fallback to legacy key
		const stored = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
		this.preference = parseThemePreference(stored);

		// 2. Track OS color scheme
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemIsDark = mediaQuery.matches;

		const onMediaChange = (e: MediaQueryListEvent) => {
			this.systemIsDark = e.matches;
			this.syncDOM();
		};
		mediaQuery.addEventListener('change', onMediaChange);

		// 3. Track cross-tab synchronization
		const onStorage = (e: StorageEvent) => {
			if (e.key === THEME_STORAGE_KEY || e.key === LEGACY_THEME_STORAGE_KEY) {
				this.preference = parseThemePreference(e.newValue);
				this.syncDOM();
			}
		};
		window.addEventListener('storage', onStorage);

		// 4. Initial DOM synchronization
		this.syncDOM();
	}

	setPreference(pref: ThemePreference) {
		this.preference = pref;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, pref);
			// Also keep legacy key synced for backward compatibility
			localStorage.setItem(LEGACY_THEME_STORAGE_KEY, String(this.effectiveTheme === 'dark'));
		}
		this.syncDOM();
	}

	cycle() {
		const next = getNextThemePreference(this.preference);
		this.setPreference(next);
	}

	toggleDark() {
		// If currently dark -> switch to light, if light -> switch to dark
		const next: ThemePreference = this.isDark ? 'light' : 'dark';
		this.setPreference(next);
	}

	syncDOM() {
		if (typeof document !== 'undefined') {
			applyThemeToDocument(this.effectiveTheme, document);
		}
	}
}

export const theme = new ThemeStore();
