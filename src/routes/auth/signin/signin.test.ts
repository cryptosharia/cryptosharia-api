import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';

const client = createApiTestClient();

describe('POST /auth/signin', () => {
	it('should return tokens and user info on successful signin', async () => {
		const password = 'mypassword321';
		const user = await createTestUser({
			hashedPassword: await hashPassword(password),
			isEmailVerified: true
		});

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
		expect(loginData.user).not.toHaveProperty('hashedPassword');
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

	it('should return 400 for invalid email format', async () => {
		const { response } = await client.POST('/auth/signin', {
			body: { email: 'not-an-email', password: 'somePassword123' }
		});
		expect(response.status).toBe(400);
	});

	it('should return 400 for short password', async () => {
		const { response } = await client.POST('/auth/signin', {
			body: { email: 'valid@email.com', password: 'short' }
		});
		expect(response.status).toBe(400);
	});

	it('should store refresh token in database on successful signin', async () => {
		const password = 'mypassword321';
		const user = await createTestUser({
			hashedPassword: await hashPassword(password),
			isEmailVerified: true
		});

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

	it('should return 403 for banned user', async () => {
		const password = 'mypassword321';
		const user = await createTestUser({
			hashedPassword: await hashPassword(password),
			isEmailVerified: true,
			status: 'banned'
		});

		const { response, error } = await client.POST('/auth/signin', {
			body: { email: user.email, password }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});

	it('should return 403 for suspended user', async () => {
		const password = 'mypassword321';
		const user = await createTestUser({
			hashedPassword: await hashPassword(password),
			isEmailVerified: true,
			status: 'suspended'
		});

		const { response, error } = await client.POST('/auth/signin', {
			body: { email: user.email, password }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});
});
