import type { ITransactionRepository } from '../repositories/transaction.repo';
import type { Transaction, CreateTransactionInput } from '../entities/transaction';
import { validateTransaction } from '../validators/transaction.validator';

export class CreateTransactionUseCase {
	constructor(private readonly repo: ITransactionRepository) {}

	async execute(input: CreateTransactionInput): Promise<Transaction> {
		const validation = validateTransaction(input);
		if (!validation.valid) {
			throw new TransactionValidationError(validation.errors);
		}

		return this.repo.create(input);
	}
}

export class TransactionValidationError extends Error {
	constructor(
		public readonly errors: { field: string; message: string }[]
	) {
		super('Validasi transaksi gagal');
		this.name = 'TransactionValidationError';
	}
}
