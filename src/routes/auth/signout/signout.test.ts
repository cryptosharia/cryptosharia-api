import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { eq } from 'drizzle-orm';
import { generateRandomToken } from '$lib/auth/tokens';

const client = createApiTestClient();

describe('POST /auth/signout', () => {
	it('should revoke a valid refresh token', async () => {
		const user = await createTestUser();
		const token = generateRandomToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(refreshTokens).values({
			userId: user.id,
			token,
			expiresAt
		});

		// 2. Call signout
		const { data, response } = await client.POST('/auth/signout', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.message).toBe('Successfully signed out');

		// 3. Verify in database
		const storedToken = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, token)
		});

		expect(storedToken?.revokedAt).toBeDefined();
		expect(storedToken?.revokedAt).not.toBeNull();
	});

	it('should return 200 even if token does not exist', async () => {
		const { data, response } = await client.POST('/auth/signout', {
			body: { refreshToken: 'non-existent-token' }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.message).toBe('Session already ended or invalid');
	});

	it('should handle already revoked tokens gracefully', async () => {
		const user = await createTestUser();
		const token = generateRandomToken();
		const revokedAt = new Date();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(refreshTokens).values({
			userId: user.id,
			token,
			expiresAt,
			revokedAt
		});

		const { data, response } = await client.POST('/auth/signout', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.message).toBe('Session already ended or invalid');
	});

	it('should return 400 for missing refreshToken', async () => {
		const { response } = await client.POST('/auth/signout');

		expect(response.status).toBe(400);
	});
});
