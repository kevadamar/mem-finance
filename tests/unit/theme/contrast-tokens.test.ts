import { describe, expect, it } from 'bun:test';

function hexToRgb(hex: string): [number, number, number] {
	const clean = hex.replace('#', '');
	const num = parseInt(clean, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(rgb: [number, number, number]): number {
	const [r, g, b] = rgb.map((c) => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
	const lum1 = relativeLuminance(hexToRgb(hex1));
	const lum2 = relativeLuminance(hexToRgb(hex2));
	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);
	return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme Design Tokens - Contrast Ratio Audits', () => {
	const tokens = {
		light: {
			canvas: '#fbf9f4',
			surface1: '#ffffff',
			surface2: '#f4efe6',
			textPrimary: '#1c1917',
			textSecondary: '#57534e',
			brandFill: '#1b6848',
			onBrand: '#ffffff',
			incomeFg: '#15803d',
			expenseFg: '#b91c1c'
		},
		dark: {
			canvas: '#121514',
			surface1: '#1a1f1d',
			surface2: '#242b28',
			textPrimary: '#f5f5f4',
			textSecondary: '#a8a29e',
			textTertiary: '#a8a29e',
			brandFill: '#5eb68d',
			onBrand: '#1c1917',
			incomeFg: '#4ade80',
			expenseFg: '#f87171'
		}
	};

	it('light theme text meets WCAG AA (>= 4.5:1)', () => {
		// Text Primary on Canvas and Surfaces
		expect(contrastRatio(tokens.light.textPrimary, tokens.light.canvas)).toBeGreaterThanOrEqual(7.0);
		expect(contrastRatio(tokens.light.textPrimary, tokens.light.surface1)).toBeGreaterThanOrEqual(7.0);
		expect(contrastRatio(tokens.light.textPrimary, tokens.light.surface2)).toBeGreaterThanOrEqual(7.0);

		// Text Secondary on Surfaces >= 4.5:1
		expect(contrastRatio(tokens.light.textSecondary, tokens.light.surface1)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens.light.textSecondary, tokens.light.canvas)).toBeGreaterThanOrEqual(4.5);
	});

	it('dark theme text meets WCAG AA (>= 4.5:1)', () => {
		// Text Primary on Canvas and Surfaces
		expect(contrastRatio(tokens.dark.textPrimary, tokens.dark.canvas)).toBeGreaterThanOrEqual(7.0);
		expect(contrastRatio(tokens.dark.textPrimary, tokens.dark.surface1)).toBeGreaterThanOrEqual(7.0);

		// Text Secondary & Tertiary on Surfaces >= 4.5:1
		expect(contrastRatio(tokens.dark.textSecondary, tokens.dark.surface1)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens.dark.textTertiary, tokens.dark.surface1)).toBeGreaterThanOrEqual(4.5);
	});

	it('brand fill and on-brand pairing achieves >= 6.5:1 contrast in both themes', () => {
		// Light: white on #1b6848
		const lightRatio = contrastRatio(tokens.light.brandFill, tokens.light.onBrand);
		expect(lightRatio).toBeGreaterThanOrEqual(6.5);

		// Dark: #1c1917 on #5eb68d
		const darkRatio = contrastRatio(tokens.dark.brandFill, tokens.dark.onBrand);
		expect(darkRatio).toBeGreaterThanOrEqual(6.5);
	});

	it('income and expense foreground colors pass accessible text contrast', () => {
		// Light income & expense against white surface
		expect(contrastRatio(tokens.light.incomeFg, tokens.light.surface1)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens.light.expenseFg, tokens.light.surface1)).toBeGreaterThanOrEqual(4.5);

		// Dark income & expense against dark surface
		expect(contrastRatio(tokens.dark.incomeFg, tokens.dark.surface1)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(tokens.dark.expenseFg, tokens.dark.surface1)).toBeGreaterThanOrEqual(4.5);
	});
});
