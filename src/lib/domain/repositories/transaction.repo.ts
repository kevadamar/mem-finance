import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../entities/transaction';

export interface ITransactionRepository {
	getAll(): Promise<Transaction[]>;
	getById(id: string): Promise<Transaction | null>;
	create(input: CreateTransactionInput): Promise<Transaction>;
	update(id: string, input: UpdateTransactionInput): Promise<Transaction>;
	delete(id: string): Promise<void>;
}
