type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Per-process guard; deploy a shared proxy limit when running multiple app instances. */
export function requestLimit(key: string, max: number, windowMs: number): number {
	const now = Date.now();
	if (buckets.size > 10000) {
		for (const [id, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(id);
	}
	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return 0;
	}
	if (bucket.count >= max) return Math.ceil((bucket.resetAt - now) / 1000);
	bucket.count++;
	return 0;
}
