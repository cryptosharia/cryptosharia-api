import { describe, it, expect } from 'vitest';
import { createApiTestClient } from '$lib/test-utils';
import { RATELIMIT_MAX } from '$lib/constants';

// Standard client (automatically uses Port 5172 from .env.test)
const client = createApiTestClient();

describe('Rate Limiting Integration', () => {
	it('should include RateLimit headers in private success responses', async () => {
		const { response } = await client.GET('/posts', {});

		expect(response.headers.get('RateLimit-Limit')).toBe(RATELIMIT_MAX.toString());
		expect(response.headers.get('RateLimit-Remaining')).toBeDefined();
		expect(response.headers.get('RateLimit-Reset')).toBeDefined();
	});

	it('should not include RateLimit headers for public endpoints', async () => {
		const { response } = await client.GET('/openapi.json', {});

		expect(response.headers.get('RateLimit-Limit')).toBeNull();
		expect(response.headers.get('RateLimit-Remaining')).toBeNull();
		expect(response.headers.get('RateLimit-Reset')).toBeNull();
	});

	it('should demonstrate header decrement', async () => {
		const { response: res1 } = await client.GET('/posts', {});
		const remaining1 = parseInt(res1.headers.get('RateLimit-Remaining') || '0');

		const { response: res2 } = await client.GET('/posts', {});
		const remaining2 = parseInt(res2.headers.get('RateLimit-Remaining') || '0');

		expect(remaining2).toBeLessThan(remaining1);
	});

	it('should identify users by Forwarded header', async () => {
		// Even if they come from the same IP (The Test Server),
		// different Forwarded values should have their own buckets.
		const res1 = await client.GET('/posts', {
			headers: { Forwarded: 'for=1.1.1.1' }
		});
		const remaining1 = parseInt(res1.response.headers.get('RateLimit-Remaining') || '0');

		const res2 = await client.GET('/posts', {
			headers: { Forwarded: 'for=2.2.2.2' }
		});
		const remaining2 = parseInt(res2.response.headers.get('RateLimit-Remaining') || '0');

		// Since they are in separate buckets, the remaining quota should start
		// from the same value for each delegated identity.
		expect(remaining1).toBe(remaining2);
	});
});
