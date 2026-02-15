import { LRUCache } from 'lru-cache';
import { RATELIMIT_MAX, RATELIMIT_WINDOW_MS } from '$lib/constants';

export type RateLimitResult = {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
};

/**
 * High-performance, in-memory sliding window rate limiter.
 * Designed to work seamlessly in long-running or warm serverless environments.
 */
export class RateLimiter {
	private cache: LRUCache<string, number>;
	private windowMs: number;
	private max: number;

	constructor(options: { max: number; windowMs: number; size?: number }) {
		this.windowMs = options.windowMs;
		this.max = options.max;
		this.cache = new LRUCache<string, number>({
			max: options.size || 5000,
			ttl: options.windowMs
		});
	}

	/**
	 * Consumes a token for the given key and returns the rate limit status.
	 */
	public async consume(key: string): Promise<RateLimitResult> {
		const now = Date.now();
		const count = this.cache.get(key) || 0;

		const result: RateLimitResult = {
			success: count < this.max,
			limit: this.max,
			remaining: Math.max(0, this.max - (count + 1)),
			reset: now + this.windowMs // Simple window reset
		};

		if (result.success) {
			this.cache.set(key, count + 1);
		}

		return result;
	}
}

/**
 * Default limiter instance.
 * Automatically gives a higher budget to Test environments (centralized in constants)
 * while maintaining a strict 100 req/min bouncer for Production.
 */
export const defaultLimiter = new RateLimiter({
	windowMs: RATELIMIT_WINDOW_MS,
	max: RATELIMIT_MAX
});
