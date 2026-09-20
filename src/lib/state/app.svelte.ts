import * as idb from '$lib/data/idb';
import { STORES } from '$lib/data/idb';
import type { Transaction } from '$lib/domain/entities/transaction';
import type { Category } from '$lib/domain/entities/category';
import type { Budget } from '$lib/domain/entities/budget';

class AppStore {
	transactions = $state<Transaction[]>([]);
	transactionsLoading = $state(false);
	transactionsRefreshing = $state(false);
	transactionsStale = $state(false);

	categories = $state<Category[]>([]);
	categoriesLoading = $state(false);

	budgets = $state<Budget[]>([]);
	budgetsLoading = $state(false);
	budgetsStale = $state(false);

	chatMessages = $state<import('$lib/domain/entities/chat').ChatMessage[]>([]);

	gmtOffset = $state(typeof localStorage !== 'undefined' ? Number(localStorage.getItem('memfinance_gmt') ?? '7') : 7);
	pendingSync = $state(0);
	online = $state(true);
	toast = $state<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

	sidebarCollapsed = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('memfinance_sidebar_collapsed') === 'true' : false);
	mobileSidebarOpen = $state(false);
	user = $state<import('$lib/types/user').AppUser | import('@supabase/supabase-js').User | null>(null);

	mutationCount = $state(0);
	isMutating = $derived(this.mutationCount > 0);
}

export const app = new AppStore();

export function toggleSidebarCollapsed() {
	app.sidebarCollapsed = !app.sidebarCollapsed;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('memfinance_sidebar_collapsed', String(app.sidebarCollapsed));
	}
}

export function toggleMobileSidebar() {
	app.mobileSidebarOpen = !app.mobileSidebarOpen;
}

export function closeMobileSidebar() {
	app.mobileSidebarOpen = false;
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
	app.toast = { message, type };
	setTimeout(() => { app.toast = null; }, 4000);
}

export async function withMutation<T>(fn: () => Promise<T>): Promise<T> {
	app.mutationCount++;
	try {
		return await fn();
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
		showToast(msg, 'error');
		throw err;
	} finally {
		app.mutationCount--;
	}
}

export async function loadTransactionsFromCache(): Promise<void> {
	app.transactionsLoading = app.transactions.length === 0;
	const cached = await idb.getAll<Transaction>(STORES.TRANSACTIONS);
	app.transactions = cached.filter((t) => t.flagActive !== false);
	app.transactionsLoading = false;
}

export async function loadCategoriesFromCache(): Promise<void> {
	app.categoriesLoading = app.categories.length === 0;
	const cached = await idb.getAll<Category>(STORES.CATEGORIES);
	app.categories = cached;
	app.categoriesLoading = false;
}

export async function loadBudgetsFromCache(): Promise<void> {
	app.budgetsLoading = app.budgets.length === 0;
	const cached = await idb.getAll<Budget>(STORES.BUDGETS);
	app.budgets = cached;
	app.budgetsLoading = false;
}
