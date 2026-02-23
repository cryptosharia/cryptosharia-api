import { describe, it, expect } from 'vitest';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { signAccessToken } from '$lib/auth/tokens';

const client = createApiTestClient();

async function getMeWithToken(token: string) {
	return client.GET('/auth/me', {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
}

describe('GET /auth/me', () => {
	it('should return user info with valid access token', async () => {
		const testUser = await createTestUser();
		const accessToken = await signAccessToken({
			userId: testUser.id,
			role: testUser.role
		});

		const { data, response } = await getMeWithToken(accessToken);

		expect(response.status).toBe(200);

		if (!data?.data) {
			throw new Error('No data received');
		}
		expect(data.data.id).toBe(testUser.id);
		expect(data.data.email).toBe(testUser.email);
		expect(data.data).toHaveProperty('role');
		expect(Array.isArray(data.data.permissions)).toBe(true);

		// Sensitive fields should be stripped
		expect(data.data).not.toHaveProperty('hashedPassword');
	});

	it('should return user info with expanded role metadata', async () => {
		// 1. Create a user with a specific role
		const testUser = await createTestUser({ role: 'admin' });
		const accessToken = await signAccessToken({
			userId: testUser.id,
			role: testUser.role
		});

		const { data, response } = await getMeWithToken(accessToken);

		expect(response.status).toBe(200);

		if (!data?.data) {
			throw new Error('No data received');
		}

		expect(data.data.role).toBe('admin');
	});

	it('should return unauthorized with non-existent user token', async () => {
		// Use a valid token structure but with a random UUID that doesn't exist
		const accessToken = await signAccessToken({
			userId: crypto.randomUUID(),
			role: 'member'
		});

		const { response } = await getMeWithToken(accessToken);

		expect(response.status).toBe(401);
	});

	it('should return 401 with missing token', async () => {
		const { response } = await client.GET('/auth/me');

		expect(response.status).toBe(401);
	});

	it.each([
		{ name: 'invalid token', token: 'invalid-token' },
		{ name: 'expired token', token: 'expired.token.string' }
	])('should return 401 with $name', async ({ token }) => {
		const { response } = await getMeWithToken(token);
		expect(response.status).toBe(401);
	});
});
