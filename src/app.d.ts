import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			userId: string | null;
			user: import('@supabase/supabase-js').User | import('$lib/types/user').AppUser | null;
			gaSheetId: string | null;
			storageStatus: import('$lib/server/storage-ownership').StorageStatus | null;
			googleOwnerEmail: string | null;
		}
	}

	interface Window {
		turnstile: {
			render: (el: string | HTMLElement, options: Record<string, unknown>) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

export {};
