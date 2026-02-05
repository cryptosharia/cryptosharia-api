import { describe, it, expect, vi } from 'vitest';
import { handle } from './hooks.server';
import { createApiTestClient } from '$lib/test-utils';
import ApiResponse from '$lib/api-response';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		CS_API_KEY_MEDIA: 'media-secret-key',
		CS_API_KEY_ACADEMY: 'academy-secret-key'
	}
}));

describe('API Key Authentication (Hooks Integration)', () => {
	const dummyHandler = vi.fn().mockImplementation(() => {
		return ApiResponse.ok({ status: 'OK' });
	});
	const client = createApiTestClient<RequestEvent>({ GET: dummyHandler }, { handle });

	it('should allow requests to documentation page (root)', async () => {
		const { response } = await client.GET('/', {});
		expect(response.status).toBe(200);
		expect(dummyHandler).toHaveBeenCalled();
	});

	it('should allow requests to OpenAPI Spec', async () => {
		const { response } = await client.GET('/openapi.json', {});
		expect(response.status).toBe(200);
		expect(dummyHandler).toHaveBeenCalled();
	});

	it('should block requests without an API key', async () => {
		const { response, error } = await client.GET('/posts', {});
		expect(response.status).toBe(401);

		expect(error?.message).toBe('Unauthorized');
	});

	it('should block requests with an invalid API key', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': 'wrong-key' }
		});
		expect(response.status).toBe(401);
	});

	it('should allow requests with a valid API key (Media)', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': 'media-secret-key' }
		});
		expect(response.status).toBe(200);
		expect(dummyHandler).toHaveBeenCalled();
	});

	it('should allow requests with a valid API key (Academy)', async () => {
		const { response } = await client.GET('/posts', {
			headers: { 'Api-Key': 'academy-secret-key' }
		});
		expect(response.status).toBe(200);
	});
});
