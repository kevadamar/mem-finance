import { GROQ_API_KEY } from '$env/static/private';
import type { ParsedTransaction } from '../../domain/entities/chat';
import { buildParserPrompt } from './prompt-builder';

export async function parseWithGroq(message: string): Promise<{ success: boolean; data: ParsedTransaction | null; fallbackLevel: 'groq'; message: string }> {
	if (!GROQ_API_KEY) throw new Error('Groq API key not configured');

	const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${GROQ_API_KEY}`
		},
		body: JSON.stringify({
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: buildParserPrompt() },
				{ role: 'user', content: message }
			],
			response_format: { type: 'json_object' },
			temperature: 0.1
		}),
		signal: AbortSignal.timeout(5000)
	});

	if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

	const result = await response.json();
	const text = result.choices?.[0]?.message?.content;
	if (!text) throw new Error('Empty Groq response');

	const parsed = JSON.parse(text);
	return {
		success: true,
		fallbackLevel: 'groq',
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
