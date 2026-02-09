import { describe, it, expect } from 'vitest';
import { createApiTestClient } from '$lib/test-utils';
import { env } from '$env/dynamic/private';

const client = createApiTestClient();

/**
 * These tests perform "smoke tests" against the real server to verify
 * that the middleware (hooks.server.ts) is correctly enforcing API Key security.
 */
describe('API Key Authentication (Hooks Integration)', () => {
	it('should allow requests to documentation page (root) without key', async () => {
		// Public route exemption check
		// '/' returns HTML document, so we must parse as text to avoid JSON errors
		const { response } = await client.GET('/', { parseAs: 'text' });
		expect(response.status).toBe(200);
	});

	it('should allow requests to OpenAPI Spec without key', async () => {
		// Public route exemption check
		const { response } = await client.GET('/openapi.json');
		expect(response.status).toBe(200);
	});

	it('should block requests without an API key', async () => {
		// Use a dedicated client without a key for this test
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': '' }
		});
		expect(response.status).toBe(401);
	});

	it('should block requests with an invalid API key', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': 'wrong-key' }
		});
		expect(response.status).toBe(401);
	});

	it('should allow requests with a valid API key (Test)', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': env.CS_API_KEY_TEST! }
		});
		expect(response.status).toBe(200);
	});
});
