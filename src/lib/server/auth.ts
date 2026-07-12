import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

export function createSupabaseServerClient(event: RequestEvent) {
	return createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					const cookies: { name: string; value: string }[] = [];
					for (const { name, value } of event.cookies.getAll()) {
						cookies.push({ name, value });
					}
					return cookies;
				},
				setAll(cookiesToSet) {
					for (const { name, value, options } of cookiesToSet) {
						// Supabase SSR supplies cookie options that its browser client
						// must be able to read and refresh. Overriding these (notably
						// with `httpOnly: true` or `secure: true` on localhost) prevents
						// the server and browser from observing the same session.
						event.cookies.set(name, value, {
							...options,
							path: options.path ?? '/'
						});
					}
				}
			}
		}
	);
}
