import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import { eq } from 'drizzle-orm';
import { generateRandomToken } from '$lib/auth/tokens';

const client = createApiTestClient();

/**
 * Helper to insert a refresh token directly in DB for a given user.
 */
async function insertRefreshToken(userId: string, opts?: { expired?: boolean; revoked?: boolean }) {
	const token = generateRandomToken();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + (opts?.expired ? -1 : 7));

	await db.insert(refreshTokens).values({
		userId,
		token,
		expiresAt,
		revokedAt: opts?.revoked ? new Date() : undefined
	});

	return token;
}

describe('POST /auth/refresh', () => {
	it('should rotate token and return new tokens', async () => {
		const user = await createTestUser();
		const oldToken = await insertRefreshToken(user.id);

		const { data, response } = await client.POST('/auth/refresh', {
			body: { refreshToken: oldToken }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.accessToken).toBeDefined();
		expect(data?.data?.refreshToken).toBeDefined();
		expect(data?.data?.refreshToken).not.toBe(oldToken);

		// Verify old token is revoked
		const revokedToken = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, oldToken)
		});
		expect(revokedToken?.revokedAt).not.toBeNull();

		// Verify new token exists
		const newToken = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, data!.data!.refreshToken)
		});
		expect(newToken).toBeDefined();
		expect(newToken?.userId).toBe(user.id);
	});

	it('should return 401 for revoked token', async () => {
		const user = await createTestUser();
		const token = await insertRefreshToken(user.id, { revoked: true });

		const { response } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(401);
	});

	it('should return 401 for expired token', async () => {
		const user = await createTestUser();
		const token = await insertRefreshToken(user.id, { expired: true });

		const { response } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(401);
	});

	it('should return 401 for invalid token', async () => {
		const { response } = await client.POST('/auth/refresh', {
			body: { refreshToken: 'invalid-token' }
		});

		expect(response.status).toBe(401);
	});

	// -----------------------------------------------------------------------
	// SEC-6: Account status enforcement on refresh
	// -----------------------------------------------------------------------

	it('should return 403 for banned user on refresh', async () => {
		const user = await createTestUser({ status: 'banned' });
		const token = await insertRefreshToken(user.id);

		const { response, error } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});

	it('should return 403 for suspended user on refresh', async () => {
		const user = await createTestUser({ status: 'suspended' });
		const token = await insertRefreshToken(user.id);

		const { response, error } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});
});
