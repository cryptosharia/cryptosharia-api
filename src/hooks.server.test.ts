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

	it.each([
		{ name: 'without an API key', apiKey: '' },
		{ name: 'with an invalid API key', apiKey: 'wrong-key' }
	])('should block requests $name', async ({ apiKey }) => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': apiKey }
		});
		expect(response.status).toBe(401);
	});

	it('should allow requests with a valid API key (Test)', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': env.CS_API_KEY_TEST! }
		});
		expect(response.status).toBe(200);
	});

	it('should ignore malformed Forwarded header and still allow private request', async () => {
		const { response } = await client.GET('/posts', {
			headers: {
				'Api-Key': env.CS_API_KEY_TEST!,
				Forwarded: 'for=not-an-ip'
			}
		});

		expect(response.status).toBe(200);
	});

	it('should reject /ops routes when using non-ops Api-Key', async () => {
		const { response } = await client.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: true } },
			headers: { 'Api-Key': env.CS_API_KEY_TEST! }
		});

		expect(response.status).toBe(401);
	});

	it('should allow /ops routes with CS_API_KEY_OPS', async () => {
		const { response } = await client.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: true } },
			headers: { 'Api-Key': env.CS_API_KEY_OPS! }
		});

		expect(response.status).toBe(200);
	});
});
