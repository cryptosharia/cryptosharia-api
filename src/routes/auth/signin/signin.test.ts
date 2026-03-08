import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import {
	createApiTestClient,
	createTestUser,
	createVerifiedTestUserWithPassword
} from '$lib/test-utils';
import { eq } from 'drizzle-orm';

const client = createApiTestClient();

describe('POST /auth/signin', () => {
	it('should return tokens and user info on successful signin', async () => {
		const password = 'mypassword321';
		const user = await createVerifiedTestUserWithPassword(password);

		const { data, response } = await client.POST('/auth/signin', {
			body: { email: user.email, password }
		});

		expect(response.status).toBe(200);

		if (!data?.data) {
			throw new Error('No data received');
		}

		const loginData = data.data;
		expect(loginData.user.id).toBe(user.id);
		expect(loginData.user.email).toBe(user.email);
		expect(loginData.accessToken).toBeDefined();
		expect(loginData.refreshToken).toBeDefined();

		// Sensitive fields should be stripped
		expect(loginData.user).not.toHaveProperty('passwordHash');
		expect(loginData.user).not.toHaveProperty('role');
		expect(loginData).not.toHaveProperty('role');
	});

	it('should return 401 for invalid email', async () => {
		const { error, response } = await client.POST('/auth/signin', {
			body: { email: 'nonexistent@example.com', password: 'anyPassword123' }
		});

		expect(response.status).toBe(401);
		expect(error?.success).toBe(false);
	});

	it('should return 401 for invalid password', async () => {
		const user = await createTestUser({ isEmailVerified: true });

		const { error, response } = await client.POST('/auth/signin', {
			body: { email: user.email, password: 'wrongPassword123' }
		});

		expect(response.status).toBe(401);
		expect(error?.success).toBe(false);
	});

	it.each([
		{
			name: 'invalid email format',
			body: { email: 'not-an-email', password: 'somePassword123' }
		},
		{
			name: 'short password',
			body: { email: 'valid@email.com', password: 'short' }
		}
	])('should return 400 for $name', async ({ body }) => {
		const { response } = await client.POST('/auth/signin', { body });
		expect(response.status).toBe(400);
	});

	it('should store refresh token in database on successful signin', async () => {
		const password = 'mypassword321';
		const user = await createVerifiedTestUserWithPassword(password);

		await client.POST('/auth/signin', {
			body: { email: user.email, password }
		});

		const storedTokens = await db.query.refreshTokens.findMany({
			where: eq(refreshTokens.userId, user.id)
		});

		expect(storedTokens).toHaveLength(1);
		expect(storedTokens[0].userId).toBe(user.id);
		expect(storedTokens[0].expiresAt).toBeDefined();
		expect(storedTokens[0].revokedAt).toBeNull();
	});

	// -----------------------------------------------------------------------
	// SEC-6: Account status enforcement
	// -----------------------------------------------------------------------

	it.each(['banned', 'suspended'] as const)('should return 403 for %s user', async (status) => {
		const password = 'mypassword321';
		const user = await createVerifiedTestUserWithPassword(password, { status });

		const { response, error } = await client.POST('/auth/signin', {
			body: { email: user.email, password }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});
});
