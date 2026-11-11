import type { Cookies } from '@sveltejs/kit';

export function isRefreshTokenRevoked(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const candidate = err as { code?: string; status?: number; message?: string; name?: string };
	// AuthSessionMissingError is normal when no session is present; do NOT treat as revocation
	if (candidate.name === 'AuthSessionMissingError') return false;

	return candidate.code === 'refresh_token_not_found'
		|| (typeof candidate.message === 'string' && (
			candidate.message.includes('Refresh Token Not Found') ||
			candidate.message.includes('Invalid Refresh Token') ||
			candidate.message.includes('refresh_token_not_found')
		));
}

export function clearAuthCookies(cookies: Cookies, reason?: string) {
	try {
		const allCookies = cookies.getAll();
		const cleared: string[] = [];
		for (const c of allCookies) {
			// CRITICAL: Never clear PKCE code-verifier cookies required for in-flight OAuth callbacks!
			if (c.name.includes('code-verifier')) continue;
			if (c.name.startsWith('sb-')) {
				cookies.delete(c.name, { path: '/' });
				cleared.push(c.name);
			}
		}
		if (cleared.length > 0) {
			console.warn('[auth] Cleared auth cookies due to revoked session:', { reason, cleared });
		}
	} catch {
		// Ignore cookie deletion errors
	}
}
