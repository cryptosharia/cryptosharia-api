import { describe, it, expect } from 'vitest';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { signAccessToken } from '$lib/auth/tokens';
import { db } from '$lib/db';
import { roles } from '$lib/db/tables';

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

		if (!data?.data) {
			throw new Error('No data received');
		}
		expect(data.data.id).toBe(testUser.id);
		expect(data.data.email).toBe(testUser.email);
		expect(data.data).toHaveProperty('role');
		expect(Array.isArray(data.data.permissions)).toBe(true);

		// Sensitive fields should be stripped
		expect(data.data).not.toHaveProperty('hashedPassword');
		expect(data.data).not.toHaveProperty('roleId');
	});

	it('should return user info with expanded role metadata', async () => {
		// 1. Create a test role
		const [testRole] = await db
			.insert(roles)
			.values({
				name: 'Test Admin',
				slug: 'test-admin'
			})
			.returning();

		// 2. Create a user with that role
		const testUser = await createTestUser({ roleId: testRole.id });
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

		if (!data?.data) {
			throw new Error('No data received');
		}

		expect(data.data.role).toEqual({
			id: testRole.id,
			name: testRole.name,
			slug: testRole.slug
		});
	});

	it('should return unauthorized with non-existent user token', async () => {
		// Use a valid token structure but with a random UUID that doesn't exist
		const accessToken = await signAccessToken({
			userId: crypto.randomUUID(),
			roleId: null
		});

		const { response } = await client.GET('/auth/me', {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		expect(response.status).toBe(401);
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
