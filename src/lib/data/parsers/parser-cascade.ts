import { parseWithGemini } from './gemini-client';
import { parseWithGroq } from './groq-client';
import { parseWithRegex } from './regex-parser';
import type { ParserResult } from '../../domain/entities/chat';

export async function parseMessage(message: string): Promise<ParserResult> {
	try {
		const geminiResult = await parseWithGemini(message);
		if (geminiResult.data && geminiResult.data.confidence > 0.5) {
			return { ...geminiResult, success: true };
		}
	} catch { /* fall through to Groq */ }

	try {
		const groqResult = await parseWithGroq(message);
		if (groqResult.data && groqResult.data.confidence > 0.3) {
			return { ...groqResult, success: true };
		}
	} catch { /* fall through to Regex */ }

	const regexResult = parseWithRegex(message);
	return regexResult;
}
