interface ScrollLockTarget {
	style: {
		overflow: string;
	};
}

type GetScrollLockTarget = () => ScrollLockTarget | null | undefined;

export function createBodyScrollLock(getTarget: GetScrollLockTarget) {
	let activeLocks = 0;
	let lockedTarget: ScrollLockTarget | null = null;
	let originalOverflow = '';

	return function acquireBodyScrollLock(): () => void {
		if (activeLocks === 0) {
			const target = getTarget();
			if (!target) return () => {};

			lockedTarget = target;
			originalOverflow = target.style.overflow;
			target.style.overflow = 'hidden';
		}

		activeLocks++;
		let released = false;

		return () => {
			if (released) return;
			released = true;
			activeLocks--;

			if (activeLocks === 0 && lockedTarget) {
				lockedTarget.style.overflow = originalOverflow;
				lockedTarget = null;
				originalOverflow = '';
			}
		};
	};
}

const acquireDocumentBodyScrollLock = createBodyScrollLock(() =>
	typeof document === 'undefined' ? null : document.body,
);

export function lockBodyScroll(): () => void {
	return acquireDocumentBodyScrollLock();
}
