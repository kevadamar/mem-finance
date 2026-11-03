import type { TransactionType } from './transaction';

export type DraftStatus =
	| 'draft'
	| 'saving'
	| 'saved_device'
	| 'synced'
	| 'failed'
	| 'cancelled';

export interface ParsedTransaction {
	type: TransactionType;
	amount: number;
	category: string;
	date: string;
	note?: string;
	confidence: number;
}

export interface TransactionDraft {
	id: string;
	type: TransactionType;
	amount: number;
	categoryId: string;
	categoryName: string;
	date: string;
	note?: string;
	status: DraftStatus;
	savedTransactionId?: string;
	errorMessage?: string;
	validationErrors?: Record<string, string>;
}

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	confirmation?: ParsedTransaction;
	confirmed?: boolean;
	draft?: TransactionDraft;
	timestamp: string;
}

export interface ParserResult {
	success: boolean;
	data: ParsedTransaction | null;
	fallbackLevel: 'gemini' | 'groq' | 'regex';
	message: string;
}

