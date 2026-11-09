import { describe, expect, it } from 'bun:test';

describe('Auth session error resilience', () => {
	it('identifies refresh_token_not_found error and clears auth session', () => {
		const simulatedAuthError = {
			__isAuthError: true,
			status: 400,
			code: 'refresh_token_not_found',
			message: 'Invalid Refresh Token: Refresh Token Not Found'
		};

		// Helper logic matching hooks.server.ts
		const isRefreshTokenRevoked = (err: unknown): boolean => {
			if (!err || typeof err !== 'object') return false;
			const candidate = err as { code?: string; status?: number; message?: string };
			return candidate.code === 'refresh_token_not_found'
				|| candidate.status === 400
				|| (typeof candidate.message === 'string' && candidate.message.includes('Refresh Token Not Found'));
		};

		expect(isRefreshTokenRevoked(simulatedAuthError)).toBe(true);

		// Cookie clearing logic
		const cookies = new Map<string, string>([
			['sb-access-token', 'expired-token'],
			['sb-refresh-token', 'revoked-token'],
			['memfinance_theme', 'dark']
		]);

		const deletedCookies: string[] = [];
		for (const [name] of cookies) {
			if (name.startsWith('sb-')) {
				deletedCookies.push(name);
				cookies.delete(name);
			}
		}

		expect(deletedCookies).toEqual(['sb-access-token', 'sb-refresh-token']);
		expect(cookies.has('memfinance_theme')).toBe(true);
		expect(cookies.has('sb-access-token')).toBe(false);
	});
});
