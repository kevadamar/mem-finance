import { describe, expect, it } from 'bun:test';
import {
	parseThemePreference,
	resolveEffectiveTheme,
	getNextThemePreference,
	applyThemeToDocument
} from '../../../src/lib/state/theme-core';

describe('Theme Resolution & Core Logic', () => {
	it('parses theme preferences including legacy boolean values', () => {
		expect(parseThemePreference('system')).toBe('system');
		expect(parseThemePreference('light')).toBe('light');
		expect(parseThemePreference('dark')).toBe('dark');
		// Legacy memfinance_dark_mode compatibility
		expect(parseThemePreference('true')).toBe('dark');
		expect(parseThemePreference('false')).toBe('light');
		// Defaults to system
		expect(parseThemePreference(null)).toBe('system');
		expect(parseThemePreference('')).toBe('system');
		expect(parseThemePreference('unknown')).toBe('system');
	});

	it('resolves effective theme according to preference and system media query', () => {
		// When system preference is selected, honor OS dark mode
		expect(resolveEffectiveTheme('system', true)).toBe('dark');
		expect(resolveEffectiveTheme('system', false)).toBe('light');

		// Explicit user preference overrides OS setting
		expect(resolveEffectiveTheme('light', true)).toBe('light');
		expect(resolveEffectiveTheme('light', false)).toBe('light');
		expect(resolveEffectiveTheme('dark', true)).toBe('dark');
		expect(resolveEffectiveTheme('dark', false)).toBe('dark');
	});

	it('cycles between theme options predictably', () => {
		expect(getNextThemePreference('light')).toBe('dark');
		expect(getNextThemePreference('dark')).toBe('system');
		expect(getNextThemePreference('system')).toBe('light');
	});

	it('applies theme classes and color-scheme to document element', () => {
		const classes = new Set<string>();
		const mockDoc = {
			documentElement: {
				classList: {
					add: (c: string) => classes.add(c),
					remove: (c: string) => classes.delete(c),
					contains: (c: string) => classes.has(c),
					toggle: (c: string, force?: boolean) => {
						if (force !== undefined) {
							if (force) classes.add(c);
							else classes.delete(c);
							return force;
						}
						if (classes.has(c)) {
							classes.delete(c);
							return false;
						}
						classes.add(c);
						return true;
					}
				},
				style: { colorScheme: '' }
			},
			querySelector: (_selector: string) => null
		};

		applyThemeToDocument('dark', mockDoc as unknown as Document);
		expect(classes.has('dark')).toBe(true);
		expect(classes.has('light')).toBe(false);
		expect(mockDoc.documentElement.style.colorScheme).toBe('dark');

		applyThemeToDocument('light', mockDoc as unknown as Document);
		expect(classes.has('light')).toBe(true);
		expect(classes.has('dark')).toBe(false);
		expect(mockDoc.documentElement.style.colorScheme).toBe('light');
	});
});
