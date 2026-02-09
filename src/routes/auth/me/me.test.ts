import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as MeAPI from './+server';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import type { RequestEvent } from '@sveltejs/kit';
import { signAccessToken } from '$lib/auth/tokens';
import { handle } from '../../../hooks.server';

// 1. Mock the environment variables for hooks.
// Since we are using the real 'hooks.server.ts' middleware in this test (via the 'handle' option),
// we need to provide a fake list of valid API Keys that the middleware can find.
// The middleware logic looks for any env variable starting with 'CS_API_KEY_'.
vi.mock('$env/dynamic/private', () => ({
	env: {
		CS_API_KEY_ADMIN: 'admin-secret-key'
	}
}));

// 2. Create the client with the handle and default API key
const client = createApiTestClient<RequestEvent>(
	{ GET: MeAPI.GET as (event: RequestEvent) => Response | Promise<Response> },
	{
		handle,
		headers: { 'Api-Key': 'admin-secret-key' }
	}
);

describe('GET /auth/me', () => {
	let testUser: Awaited<ReturnType<typeof createTestUser>>;
	let accessToken: string;

	beforeEach(async () => {
		testUser = await createTestUser();
		accessToken = await signAccessToken({
			userId: testUser.id,
			roleId: testUser.roleId
		});
	});

	it('should return user info with valid access token', async () => {
		const { data, response } = await client.GET('/auth/me', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		expect(response.status).toBe(200);
		if (!data) {
			throw new Error('No data received');
		}
		expect(data.success).toBe(true);
		expect(data.data.user.id).toBe(testUser.id);
		expect(data.data.user.email).toBe(testUser.email);
		// Sensitive fields should be stripped
		expect(data.data.user).not.toHaveProperty('hashedPassword');
	});

	it('should return 401 with missing token', async () => {
		const { response } = await client.GET('/auth/me');

		expect(response.status).toBe(401);
	});

	it('should return 401 with invalid token', async () => {
		const { response } = await client.GET('/auth/me', {
			headers: {
				Authorization: 'Bearer invalid-token'
			}
		});

		expect(response.status).toBe(401);
	});

	it('should return 401 with expired token', async () => {
		const { response } = await client.GET('/auth/me', {
			headers: {
				Authorization: 'Bearer expired.token.string'
			}
		});

		expect(response.status).toBe(401);
	});
});
