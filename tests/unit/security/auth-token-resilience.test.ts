import { describe, expect, it } from 'bun:test';
import { isRefreshTokenRevoked, clearAuthCookies } from '../../../src/lib/server/auth-resilience';

describe('Auth session error resilience', () => {
	it('identifies refresh_token_not_found error and ignores AuthSessionMissingError', () => {
		const simulatedAuthError = {
			__isAuthError: true,
			status: 400,
			code: 'refresh_token_not_found',
			message: 'Invalid Refresh Token: Refresh Token Not Found'
		};

		const sessionMissingError = {
			name: 'AuthSessionMissingError',
			message: 'Auth session missing!',
			status: 400
		};

		expect(isRefreshTokenRevoked(simulatedAuthError)).toBe(true);
		expect(isRefreshTokenRevoked(sessionMissingError)).toBe(false);
		expect(isRefreshTokenRevoked(null)).toBe(false);
		expect(isRefreshTokenRevoked(new Error('Network failure'))).toBe(false);
	});

	it('clears session cookies but preserves PKCE code-verifier cookies', () => {
		const cookieMap = new Map<string, string>([
			['sb-123-auth-token', 'expired-token'],
			['sb-123-auth-token-code-verifier', 'pkce-verifier-secret'],
			['memfinance_theme', 'dark']
		]);

		const mockCookies = {
			getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
			delete: (name: string, _opts: { path: string }) => { cookieMap.delete(name); },
			get: (name: string) => cookieMap.get(name),
			set: (name: string, value: string) => { cookieMap.set(name, value); },
			serialize: () => ''
		} as unknown as import('@sveltejs/kit').Cookies;

		clearAuthCookies(mockCookies, 'test');

		// Session token should be deleted
		expect(cookieMap.has('sb-123-auth-token')).toBe(false);
		// PKCE code-verifier must NEVER be deleted
		expect(cookieMap.has('sb-123-auth-token-code-verifier')).toBe(true);
		expect(cookieMap.get('sb-123-auth-token-code-verifier')).toBe('pkce-verifier-secret');
		// Non-sb cookies must be preserved
		expect(cookieMap.has('memfinance_theme')).toBe(true);
	});
});
