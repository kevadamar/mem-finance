import { runtimeEnv } from '$lib/server/env';
import type { ParsedTransaction } from '../../domain/entities/chat';
import { buildParserPrompt } from './prompt-builder';

export async function parseWithGemini(message: string): Promise<{ success: boolean; data: ParsedTransaction | null; fallbackLevel: 'gemini'; message: string }> {
	const apiKey = runtimeEnv.geminiApiKey;
	if (!apiKey) throw new Error('Gemini API key not configured');

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				system_instruction: { parts: [{ text: buildParserPrompt() }] },
				contents: [{ parts: [{ text: message }] }],
				generationConfig: {
					response_mime_type: 'application/json',
					temperature: 0.1
				}
			}),
			signal: AbortSignal.timeout(5000)
		}
	);

	if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

	const result = await response.json();
	const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) throw new Error('Empty Gemini response');

	const parsed = JSON.parse(text);
	return {
		success: true,
		fallbackLevel: 'gemini',
		data: {
			type: parsed.type || 'expense',
			amount: parsed.amount || 0,
			category: parsed.category || 'Lainnya',
			date: parsed.date || new Date().toISOString().split('T')[0],
			note: parsed.note,
			confidence: parsed.confidence ?? 0.8
		},
		message: ''
	};
}
