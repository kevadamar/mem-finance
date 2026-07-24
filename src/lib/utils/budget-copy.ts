import type { Budget, CreateBudgetInput } from '$lib/domain/entities/budget';

export interface BudgetPeriod {
	month: number;
	year: number;
}

export function getPreviousBudgetPeriod({ month, year }: BudgetPeriod): BudgetPeriod {
	return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

export function getBudgetCopyCandidates(
	budgets: Budget[],
	source: BudgetPeriod,
	target: BudgetPeriod
): CreateBudgetInput[] {
	if (source.month === target.month && source.year === target.year) return [];

	const targetCategoryIds = new Set(
		budgets
			.filter((budget) => Number(budget.month) === target.month && Number(budget.year) === target.year)
			.map((budget) => budget.categoryId)
	);
	const copiedCategoryIds = new Set<string>();

	return budgets
		.filter((budget) => {
			const isSourceBudget = Number(budget.month) === source.month && Number(budget.year) === source.year;
			const canCopy = budget.flagActive !== false && !targetCategoryIds.has(budget.categoryId) && !copiedCategoryIds.has(budget.categoryId);
			if (isSourceBudget && canCopy) copiedCategoryIds.add(budget.categoryId);
			return isSourceBudget && canCopy;
		})
		.map(({ categoryId, amount }) => ({ categoryId, amount, month: target.month, year: target.year }));
}
