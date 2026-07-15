import { describe, expect, it } from 'bun:test';
import { createBodyScrollLock } from '../../../src/lib/utils/body-scroll-lock';

function createTarget(overflow = '') {
	return { style: { overflow } };
}

describe('body scroll lock', () => {
	it('locks and restores a single target', () => {
		const target = createTarget();
		const acquire = createBodyScrollLock(() => target);

		const release = acquire();
		expect(target.style.overflow).toBe('hidden');

		release();
		expect(target.style.overflow).toBe('');
	});

	it('keeps scrolling locked until every overlapping modal releases it', () => {
		const target = createTarget();
		const acquire = createBodyScrollLock(() => target);

		const releaseDetailModal = acquire();
		const releaseEditModal = acquire();

		releaseDetailModal();
		expect(target.style.overflow).toBe('hidden');

		releaseEditModal();
		expect(target.style.overflow).toBe('');
	});

	it('handles overlapping modal cleanup in reverse order', () => {
		const target = createTarget();
		const acquire = createBodyScrollLock(() => target);

		const releaseFirst = acquire();
		const releaseSecond = acquire();

		releaseSecond();
		expect(target.style.overflow).toBe('hidden');

		releaseFirst();
		expect(target.style.overflow).toBe('');
	});

	it('makes each release function idempotent', () => {
		const target = createTarget();
		const acquire = createBodyScrollLock(() => target);

		const releaseFirst = acquire();
		const releaseSecond = acquire();

		releaseFirst();
		releaseFirst();
		expect(target.style.overflow).toBe('hidden');

		releaseSecond();
		expect(target.style.overflow).toBe('');
	});

	it('restores a pre-existing overflow value after the last release', () => {
		const target = createTarget('clip');
		const acquire = createBodyScrollLock(() => target);

		const release = acquire();
		expect(target.style.overflow).toBe('hidden');

		release();
		expect(target.style.overflow).toBe('clip');
	});

	it('returns a safe no-op release when no DOM target exists', () => {
		const acquire = createBodyScrollLock(() => null);
		const release = acquire();

		expect(() => release()).not.toThrow();
		expect(() => release()).not.toThrow();
	});
});
