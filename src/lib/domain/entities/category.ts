export type CategoryType = 'income' | 'expense';

export interface Category {
	id: string;
	name: string;
	type: CategoryType;
	color: string;
	icon: string;
	isDefault: boolean;
}

export interface CreateCategoryInput {
	name: string;
	type: CategoryType;
	color: string;
	icon: string;
}

export interface UpdateCategoryInput {
	name?: string;
	color?: string;
	icon?: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
	{ name: 'Makanan', type: 'expense', color: '#FF6B6B', icon: 'utensils-crossed', isDefault: true },
	{ name: 'Minuman', type: 'expense', color: '#F59E0B', icon: 'cup-soda', isDefault: true },
	{ name: 'Jajan & Cemilan', type: 'expense', color: '#F97316', icon: 'cookie', isDefault: true },
	{ name: 'Transportasi', type: 'expense', color: '#4ECDC4', icon: 'car', isDefault: true },
	{ name: 'Bensin & Parkir', type: 'expense', color: '#06B6D4', icon: 'fuel', isDefault: true },
	{ name: 'Ojek & Taksi', type: 'expense', color: '#F43F5E', icon: 'bike', isDefault: true },
	{ name: 'Belanja', type: 'expense', color: '#FFE66D', icon: 'shopping-bag', isDefault: true },
	{ name: 'Pulsa & Kuota', type: 'expense', color: '#8B5CF6', icon: 'smartphone', isDefault: true },
	{ name: 'Hiburan', type: 'expense', color: '#A78BFA', icon: 'gamepad-2', isDefault: true },
	{ name: 'Streaming', type: 'expense', color: '#EC4899', icon: 'tv', isDefault: true },
	{ name: 'Tagihan', type: 'expense', color: '#F97316', icon: 'receipt', isDefault: true },
	{ name: 'Listrik & Air', type: 'expense', color: '#FBBF24', icon: 'zap', isDefault: true },
	{ name: 'Kesehatan', type: 'expense', color: '#22C55E', icon: 'heart-pulse', isDefault: true },
	{ name: 'Pendidikan', type: 'expense', color: '#3B82F6', icon: 'graduation-cap', isDefault: true },
	{ name: 'Rokok', type: 'expense', color: '#A1A1AA', icon: 'cigarette', isDefault: true },
	{ name: 'Kos/Kontrakan', type: 'expense', color: '#F472B6', icon: 'home', isDefault: true },
	{ name: 'Investasi', type: 'expense', color: '#10B981', icon: 'trending-up', isDefault: true },
	{ name: 'E-commerce', type: 'expense', color: '#6366F1', icon: 'shopping-cart', isDefault: true },
	{ name: 'Donasi', type: 'expense', color: '#14B8A6', icon: 'heart', isDefault: true },
	{ name: 'Lainnya', type: 'expense', color: '#6B7280', icon: 'more-horizontal', isDefault: true }
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
	{ name: 'Gaji', type: 'income', color: '#22C55E', icon: 'briefcase', isDefault: true },
	{ name: 'Freelance', type: 'income', color: '#3B82F6', icon: 'laptop', isDefault: true },
	{ name: 'Investasi', type: 'income', color: '#A78BFA', icon: 'trending-up', isDefault: true },
	{ name: 'Hadiah', type: 'income', color: '#FF6B6B', icon: 'gift', isDefault: true },
	{ name: 'Refund', type: 'income', color: '#4ECDC4', icon: 'rotate-ccw', isDefault: true },
	{ name: 'Lainnya', type: 'income', color: '#6B7280', icon: 'more-horizontal', isDefault: true }
];
