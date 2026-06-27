export type TransactionType = 'income' | 'expense';

export interface Transaction {
	id: string;
	type: TransactionType;
	amount: number;
	categoryId: string;
	date: string;
	note?: string;
	createdAt: string;
	updatedAt: string;
	flagActive?: boolean;
}

export interface CreateTransactionInput {
	type: TransactionType;
	amount: number;
	categoryId: string;
	date: string;
	note?: string;
}

export interface UpdateTransactionInput {
	type?: TransactionType;
	amount?: number;
	categoryId?: string;
	date?: string;
	note?: string;
}
