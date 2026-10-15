/**
 * Counts *failed* attempts per key (client IP + route) in a sliding window; once `maxFailures` land within
 * `windowMs`, further attempts are refused until the oldest failure ages out. A success clears the key.
 * Guards login, file open/new, and unlock against password guessing (D18).
 */
export class FailureRateLimiter {
	private readonly failures = new Map<string, number[]>();

	constructor(
		private readonly maxFailures = 5,
		private readonly windowMs = 60_000,
		private readonly now: () => number = Date.now,
	) {}

	/** Seconds until another attempt is allowed, or 0 if one is allowed now. */
	retryAfterSeconds(key: string): number {
		const recent = this.prune(key);
		if (recent.length < this.maxFailures) return 0;
		return Math.max(1, Math.ceil((recent[0]! + this.windowMs - this.now()) / 1000));
	}

	recordFailure(key: string): void {
		const recent = this.prune(key);
		recent.push(this.now());
		this.failures.set(key, recent);
	}

	reset(key: string): void {
		this.failures.delete(key);
	}

	private prune(key: string): number[] {
		const cutoff = this.now() - this.windowMs;
		const recent = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
		if (recent.length === 0) this.failures.delete(key);
		else this.failures.set(key, recent);
		return recent;
	}
}
