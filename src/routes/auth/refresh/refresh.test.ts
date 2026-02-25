import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { refreshTokens, users } from '$lib/db/tables';
import { createApiTestClient, createTestUser, insertTestRefreshToken } from '$lib/test-utils';
import { eq } from 'drizzle-orm';

const client = createApiTestClient();

describe('POST /auth/refresh', () => {
	it('should rotate token and return new tokens', async () => {
		const user = await createTestUser();
		const oldToken = await insertTestRefreshToken(user.id);

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

	it('should allow only one success for concurrent refresh requests using same token', async () => {
		const user = await createTestUser();
		const oldToken = await insertTestRefreshToken(user.id);

		const [first, second] = await Promise.all([
			client.POST('/auth/refresh', { body: { refreshToken: oldToken } }),
			client.POST('/auth/refresh', { body: { refreshToken: oldToken } })
		]);

		const statuses = [first.response.status, second.response.status].sort((a, b) => a - b);
		expect(statuses).toEqual([200, 401]);

		const successful = first.response.status === 200 ? first : second;
		const rotatedToken = successful.data?.data?.refreshToken;
		expect(rotatedToken).toBeDefined();

		const oldTokenRow = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, oldToken)
		});
		expect(oldTokenRow?.revokedAt).not.toBeNull();

		const allUserTokens = await db.query.refreshTokens.findMany({
			where: eq(refreshTokens.userId, user.id)
		});
		const activeTokens = allUserTokens.filter((token) => token.revokedAt === null);

		expect(activeTokens).toHaveLength(1);
		expect(activeTokens[0]?.token).toBe(rotatedToken);
	});

	it.each([
		{ name: 'revoked token', options: { revoked: true } },
		{ name: 'expired token', options: { expired: true } }
	])('should return 401 for $name', async ({ options }) => {
		const user = await createTestUser();
		const token = await insertTestRefreshToken(user.id, options);

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

	it.each(['banned', 'suspended'] as const)(
		'should return 403 for %s user on refresh',
		async (status) => {
			const user = await createTestUser({ status });
			const token = await insertTestRefreshToken(user.id);

			const { response, error } = await client.POST('/auth/refresh', {
				body: { refreshToken: token }
			});

			expect(response.status).toBe(403);
			expect(error?.message).toContain('not active');
		}
	);

	it('should return 403 when user becomes suspended after token issuance', async () => {
		const user = await createTestUser({ status: 'active' });
		const token = await insertTestRefreshToken(user.id);

		await db.update(users).set({ status: 'suspended' }).where(eq(users.id, user.id));

		const { response, error } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(403);
		expect(error?.message).toContain('not active');
	});
});
