export type OCRPoint = [number, number];

export interface OCRItem {
	text: string;
	confidence: number;
	box: OCRPoint[];
}

export interface OCRResponse {
	status: string;
	message: string;
	data: OCRItem[];
}

export interface ParsedReceiptData {
	totalAmount: number | null;
	totalAmountText: string | null;
	totalKeyword: string | null;
	confidence: number | null;
	rawText: string;
}

interface PositionedItem extends OCRItem {
	centerX: number;
	centerY: number;
	height: number;
	width: number;
}

interface AmountCandidate {
	value: number;
	text: string;
	confidence: number;
	keyword: string;
	distance: number;
}

const TOTAL_KEYWORD_PATTERN = /\b(grand\s+total|total|subtotal|sub\s*total|amount|jumlah|bayar)\b/i;
const MONEY_TOKEN_PATTERN = /(?:rp\s*)?-?\d[\d.,\s]*(?:,\d{2}|\.\d{2})?/gi;

export function parseReceiptOcr(items: OCRItem[]): ParsedReceiptData {
	const positionedItems = items.map(toPositionedItem).filter((item) => item.text.trim().length > 0);
	const rawText = positionedItems.map((item) => item.text).join('\n');
	const candidates: AmountCandidate[] = [];

	for (const keywordItem of positionedItems) {
		const keywordMatch = keywordItem.text.match(TOTAL_KEYWORD_PATTERN);
		if (!keywordMatch) continue;

		const nearbyItems = positionedItems.filter((item) => isSameLineOrImmediatelyBelow(keywordItem, item));
		const sameLineText = orderLeftToRight(nearbyItems.filter((item) => isSameLine(keywordItem, item)))
			.map((item) => item.text)
			.join(' ');
		const belowText = orderLeftToRight(nearbyItems.filter((item) => !isSameLine(keywordItem, item)))
			.map((item) => item.text)
			.join(' ');

		for (const source of [sameLineText, belowText, keywordItem.text]) {
			for (const amount of extractAmountTokens(source)) {
				candidates.push({
					...amount,
					confidence: keywordItem.confidence,
					keyword: keywordMatch[0],
					distance: Math.abs(keywordItem.centerY - averageY(nearbyItems))
				});
			}
		}
	}

	const fallbackAmounts = extractAmountTokens(rawText);
	const bestCandidate = candidates.sort(compareCandidates)[0] ?? null;
	const fallbackAmount = fallbackAmounts.sort((a, b) => b.value - a.value)[0] ?? null;

	return {
		totalAmount: bestCandidate?.value ?? fallbackAmount?.value ?? null,
		totalAmountText: bestCandidate?.text ?? fallbackAmount?.text ?? null,
		totalKeyword: bestCandidate?.keyword ?? null,
		confidence: bestCandidate?.confidence ?? null,
		rawText
	};
}

function toPositionedItem(item: OCRItem): PositionedItem {
	const xs = item.box.map(([x]) => x);
	const ys = item.box.map(([, y]) => y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	return {
		...item,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
		width: maxX - minX,
		height: maxY - minY
	};
}

function isSameLine(anchor: PositionedItem, item: PositionedItem): boolean {
	const tolerance = Math.max(anchor.height, item.height, 12) * 0.75;
	return Math.abs(anchor.centerY - item.centerY) <= tolerance;
}

function isSameLineOrImmediatelyBelow(anchor: PositionedItem, item: PositionedItem): boolean {
	if (isSameLine(anchor, item)) return true;

	const verticalGap = item.centerY - anchor.centerY;
	const maxGap = Math.max(anchor.height, item.height, 18) * 2.4;
	return verticalGap > 0 && verticalGap <= maxGap;
}

function orderLeftToRight(items: PositionedItem[]): PositionedItem[] {
	return [...items].sort((a, b) => a.centerX - b.centerX);
}

function averageY(items: PositionedItem[]): number {
	if (items.length === 0) return 0;
	return items.reduce((sum, item) => sum + item.centerY, 0) / items.length;
}

function extractAmountTokens(text: string): Array<{ value: number; text: string }> {
	const matches = text.match(MONEY_TOKEN_PATTERN) ?? [];
	return matches
		.map((token) => ({ value: parseMoneyToken(token), text: token.trim() }))
		.filter((amount): amount is { value: number; text: string } => amount.value !== null && amount.value > 0);
}

function parseMoneyToken(token: string): number | null {
	const normalized = token.toLowerCase().replace(/rp/g, '').replace(/\s/g, '').trim();
	if (!normalized || normalized.startsWith('-')) return null;

	const cleaned = normalized.replace(/[^\d.,]/g, '');
	if (!/\d/.test(cleaned)) return null;

	const hasComma = cleaned.includes(',');
	const hasDot = cleaned.includes('.');

	if (hasComma && hasDot) {
		const lastComma = cleaned.lastIndexOf(',');
		const lastDot = cleaned.lastIndexOf('.');
		const decimalSeparator = lastComma > lastDot ? ',' : '.';
		const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
		const parsed = Number(cleaned.replaceAll(thousandSeparator, '').replace(decimalSeparator, '.'));
		return Number.isFinite(parsed) ? parsed : null;
	}

	const separator = hasComma ? ',' : hasDot ? '.' : null;
	if (!separator) {
		const parsed = Number(cleaned);
		return Number.isFinite(parsed) ? parsed : null;
	}

	const parts = cleaned.split(separator);
	const trailing = parts.at(-1) ?? '';
	const isThousands = trailing.length === 3 && parts.every((part) => /^\d{1,3}$/.test(part));
	const isDecimal = trailing.length === 2 && parts.length === 2;

	if (isThousands) {
		const parsed = Number(parts.join(''));
		return Number.isFinite(parsed) ? parsed : null;
	}

	if (isDecimal) {
		const parsed = Number(cleaned.replace(separator, '.'));
		return Number.isFinite(parsed) ? parsed : null;
	}

	const parsed = Number(cleaned.replaceAll(separator, ''));
	return Number.isFinite(parsed) ? parsed : null;
}

function compareCandidates(a: AmountCandidate, b: AmountCandidate): number {
	if (b.value !== a.value) return b.value - a.value;
	if (a.distance !== b.distance) return a.distance - b.distance;
	return b.confidence - a.confidence;
}
