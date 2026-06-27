export interface Budget {
	id: string;
	categoryId: string;
	amount: number;
	month: number;
	year: number;
	createdAt: string;
}

export interface CreateBudgetInput {
	categoryId: string;
	amount: number;
	month: number;
	year: number;
}

export interface BudgetSummary {
	categoryId: string;
	categoryName: string;
	categoryColor: string;
	budgetAmount: number;
	spentAmount: number;
	remainingAmount: number;
	percentage: number;
}
