import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			userId: string | null;
			gaSheetId: string | null;
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
