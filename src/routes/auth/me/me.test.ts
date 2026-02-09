import { describe, it, expect } from 'vitest';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { signAccessToken } from '$lib/auth/tokens';

const client = createApiTestClient();

describe('GET /auth/me', () => {
	it('should return user info with valid access token', async () => {
		const testUser = await createTestUser();
		const accessToken = await signAccessToken({
			userId: testUser.id,
			roleId: testUser.roleId
		});

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
