import { describe, it, expect, beforeEach } from 'vitest';
import * as RefreshAPI from './+server';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import type { RequestEvent } from './$types';
import { eq } from 'drizzle-orm';
import { generateRandomToken } from '$lib/auth/tokens';

const client = createApiTestClient<RequestEvent>(RefreshAPI);

describe('POST /auth/refresh', () => {
	let testUserId: string;

	beforeEach(async () => {
		const user = await createTestUser();
		testUserId = user.id;
	});

	it('should rotate token and return new tokens', async () => {
		// 1. Create a "session" in the database
		const oldToken = generateRandomToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(refreshTokens).values({
			userId: testUserId,
			token: oldToken,
			expiresAt
		});

		// 2. Refresh
		const { data, response } = await client.POST('/auth/refresh', {
			body: { refreshToken: oldToken }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.accessToken).toBeDefined();
		expect(data?.data?.refreshToken).toBeDefined();
		expect(data?.data?.refreshToken).not.toBe(oldToken);

		// 3. Verify old token is revoked
		const revokedToken = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, oldToken)
		});
		expect(revokedToken?.revokedAt).not.toBeNull();

		// 4. Verify new token exists
		const newToken = await db.query.refreshTokens.findFirst({
			where: eq(refreshTokens.token, data!.data!.refreshToken)
		});
		expect(newToken).toBeDefined();
		expect(newToken?.userId).toBe(testUserId);
	});

	it('should return 401 for revoked token', async () => {
		const token = generateRandomToken();
		const revokedAt = new Date();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(refreshTokens).values({
			userId: testUserId,
			token,
			expiresAt,
			revokedAt
		});

		const { response } = await client.POST('/auth/refresh', {
			body: { refreshToken: token }
		});

		expect(response.status).toBe(401);
	});

	it('should return 401 for expired token', async () => {
		const token = generateRandomToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() - 1); // Expired yesterday

		await db.insert(refreshTokens).values({
			userId: testUserId,
			token,
			expiresAt
		});

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
});
