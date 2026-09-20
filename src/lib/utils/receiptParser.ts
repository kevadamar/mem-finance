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
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	centerX: number;
	centerY: number;
	height: number;
	width: number;
}

export interface ExtractedTotalAmount {
	value: number;
	text: string;
	confidence: number;
	keyword: string;
	centerX: number;
	centerY: number;
	source: 'same-line' | 'below-line';
}

const TARGET_KEYWORDS = [
	'GRAND TOTAL',
	'TOTAL BAYAR',
	'TOTAL PAYMENT',
	'AMOUNT DUE',
	'TOTAL DUE',
	'TOTAL AMOUNT',
	'JUMLAH BAYAR',
	'TOTAL'
] as const;

const REJECT_KEYWORD_PATTERN = /\b(?:sub\s*total|subtotal|pre[-\s]*discount|total\s+(?:item|items|qty|quantity)|item\s+total)\b/i;
const CURRENCY_TOKEN_PATTERN = /\b(?:rp|idr)\.?\s*-?\d[\d.,]*(?:\s*(?:rp|idr)\b)?|\b-?\d[\d.,]*\b/gi;

export function parseReceiptOcr(items: OCRItem[]): ParsedReceiptData {
	const positionedItems = items.map(toPositionedItem).filter((item) => item.text.trim().length > 0);
	const rawText = positionedItems.map((item) => item.text).join('\n');
	const total = extractTotalAmount(items);

	return {
		totalAmount: total?.value ?? null,
		totalAmountText: total?.text ?? null,
		totalKeyword: total?.keyword ?? null,
		confidence: total?.confidence ?? null,
		rawText
	};
}

/**
 * Extracts the receipt total using geometric OCR heuristics.
 *
 * The function intentionally avoids joining text from neighboring OCR rows. Each
 * amount candidate is parsed from an individual OCR block, then compared to a
 * strict TOTAL-like keyword using box geometry.
 */
export function extractTotalAmount(items: OCRItem[]): ExtractedTotalAmount | null {
	const positionedItems = items.map(toPositionedItem).filter((item) => item.text.trim().length > 0);
	const keywordItems = positionedItems
		.map((item) => ({ item, keyword: findTargetKeyword(item.text) }))
		.filter((entry): entry is { item: PositionedItem; keyword: string } => entry.keyword !== null);

	const candidates: ExtractedTotalAmount[] = [];

	for (const { item: keywordItem, keyword } of keywordItems) {
		const sameLineCandidates = findSameLineAmountCandidates(keywordItem, keyword, positionedItems);
		if (sameLineCandidates.length > 0) {
			candidates.push(selectRightMost(sameLineCandidates));
			continue;
		}

		const belowLineCandidates = findBelowLineAmountCandidates(keywordItem, keyword, positionedItems);
		if (belowLineCandidates.length > 0) {
			candidates.push(selectRightMost(belowLineCandidates));
		}
	}

	if (candidates.length === 0) return null;

	return candidates.sort(compareTotalCandidates)[0] ?? null;
}

function findSameLineAmountCandidates(
	keywordItem: PositionedItem,
	keyword: string,
	items: PositionedItem[]
): ExtractedTotalAmount[] {
	// Dynamic same-line tolerance: OCR boxes vary by font size and perspective.
	// Half the keyword height keeps us on the current row and prevents accidental
	// concatenation with Subtotal / tax lines directly above or below.
	const tolerance = Math.max(keywordItem.height * 0.5, 8);

	return items
		.filter((item) => Math.abs(item.centerY - keywordItem.centerY) <= tolerance)
		.flatMap((item) => toAmountCandidates(item, keyword, 'same-line'))
		.filter((candidate) => candidate.centerX >= keywordItem.centerX);
}

function findBelowLineAmountCandidates(
	keywordItem: PositionedItem,
	keyword: string,
	items: PositionedItem[]
): ExtractedTotalAmount[] {
	// Fallback for narrow receipts: the numeric total may be printed on the
	// immediate next visual row below the TOTAL keyword. We restrict the vertical
	// gap to roughly one line-height and choose only the nearest below-line row.
	const maxGap = Math.max(keywordItem.height * 1.8, 28);
	const belowRows = items
		.filter((item) => item.centerY > keywordItem.centerY)
		.map((item) => ({ item, gap: item.centerY - keywordItem.centerY }))
		.filter(({ gap }) => gap <= maxGap)
		.sort((a, b) => a.gap - b.gap);

	const nearestRow = belowRows[0];
	if (!nearestRow) return [];

	const rowTolerance = Math.max(nearestRow.item.height * 0.5, 8);
	return belowRows
		.filter(({ item }) => Math.abs(item.centerY - nearestRow.item.centerY) <= rowTolerance)
		.flatMap(({ item }) => toAmountCandidates(item, keyword, 'below-line'));
}

function toAmountCandidates(
	item: PositionedItem,
	keyword: string,
	source: ExtractedTotalAmount['source']
): ExtractedTotalAmount[] {
	return extractCurrencyTokens(item.text).map(({ text, value }) => ({
		text,
		value,
		confidence: item.confidence,
		keyword,
		centerX: item.centerX,
		centerY: item.centerY,
		source
	}));
}

function findTargetKeyword(text: string): string | null {
	const normalized = normalizeKeywordText(text);
	if (!normalized || REJECT_KEYWORD_PATTERN.test(normalized)) return null;

	for (const keyword of TARGET_KEYWORDS) {
		const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
		if (pattern.test(normalized)) return keyword;
	}

	return null;
}

function normalizeKeywordText(text: string): string {
	return text
		.replace(CURRENCY_TOKEN_PATTERN, ' ')
		.replace(/[^a-zA-Z\s-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toUpperCase();
}

function selectRightMost(candidates: ExtractedTotalAmount[]): ExtractedTotalAmount {
	return [...candidates].sort((a, b) => {
		if (b.centerX !== a.centerX) return b.centerX - a.centerX;
		return b.value - a.value;
	})[0];
}

function compareTotalCandidates(a: ExtractedTotalAmount, b: ExtractedTotalAmount): number {
	// Prefer exact same-line values over below-line fallback. Within each group,
	// lower visual position usually represents the final total after tax/service
	// lines. The right-most tie-breaker handles multiple numbers on the same row.
	if (a.source !== b.source) return a.source === 'same-line' ? -1 : 1;
	if (b.centerY !== a.centerY) return b.centerY - a.centerY;
	if (b.centerX !== a.centerX) return b.centerX - a.centerX;
	return b.confidence - a.confidence;
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
		minX,
		maxX,
		minY,
		maxY,
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
		width: maxX - minX,
		height: maxY - minY
	};
}

function extractCurrencyTokens(text: string): Array<{ value: number; text: string }> {
	const matches = text.match(CURRENCY_TOKEN_PATTERN) ?? [];
	return matches
		.map((token) => ({ text: token.trim(), value: parseCurrencyAmount(token) }))
		.filter((amount): amount is { value: number; text: string } => amount.value !== null && amount.value > 0);
}

export function parseCurrencyAmount(value: string): number | null {
	const normalized = value
		.toLowerCase()
		.replace(/\b(?:rp|idr)\b\.?/g, '')
		.replace(/\s/g, '')
		.trim();

	if (!normalized || normalized.startsWith('-')) return null;

	const cleaned = normalized.replace(/[^\d.,]/g, '');
	if (!/\d/.test(cleaned)) return null;

	const hasComma = cleaned.includes(',');
	const hasDot = cleaned.includes('.');

	if (hasComma && hasDot) {
		return parseMixedSeparators(cleaned);
	}

	if (hasDot) return parseSingleSeparator(cleaned, '.');
	if (hasComma) return parseSingleSeparator(cleaned, ',');

	const parsed = Number(cleaned);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseMixedSeparators(value: string): number | null {
	const lastComma = value.lastIndexOf(',');
	const lastDot = value.lastIndexOf('.');
	const decimalSeparator = lastComma > lastDot ? ',' : '.';
	const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
	const parsed = Number(value.replaceAll(thousandSeparator, '').replace(decimalSeparator, '.'));
	return Number.isFinite(parsed) ? parsed : null;
}

function parseSingleSeparator(value: string, separator: '.' | ','): number | null {
	const parts = value.split(separator);
	const trailing = parts.at(-1) ?? '';
	const allGroupsValid = parts.every((part, index) => {
		if (index === 0) return /^\d{1,3}$/.test(part);
		return /^\d{3}$/.test(part);
	});

	// Indonesian receipt amounts commonly use dots as thousands separators:
	// "20.000" => 20000, "1.820" => 1820.
	if (trailing.length === 3 && allGroupsValid) {
		const parsed = Number(parts.join(''));
		return Number.isFinite(parsed) ? parsed : null;
	}

	// Decimal values such as "20000.00" or "20.000,00".
	if (trailing.length === 2 && parts.length === 2) {
		const parsed = Number(value.replace(separator, '.'));
		return Number.isFinite(parsed) ? Math.round(parsed) : null;
	}

	const parsed = Number(value.replaceAll(separator, ''));
	return Number.isFinite(parsed) ? parsed : null;
}
