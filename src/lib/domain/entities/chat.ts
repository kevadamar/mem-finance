import type { TransactionType } from './transaction';

export interface ParsedTransaction {
	type: TransactionType;
	amount: number;
	category: string;
	date: string;
	note?: string;
	confidence: number;
}

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	confirmation?: ParsedTransaction;
	confirmed?: boolean;
	timestamp: string;
}

export interface ParserResult {
	success: boolean;
	data: ParsedTransaction | null;
	fallbackLevel: 'gemini' | 'groq' | 'regex';
	message: string;
}
