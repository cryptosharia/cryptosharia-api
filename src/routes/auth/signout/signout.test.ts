import { describe, it, expect, beforeEach } from 'vitest';
import * as SignoutAPI from './+server';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { createApiTestClient, createTestUser } from '$lib/test-utils';
import type { RequestEvent } from './$types';
import { eq } from 'drizzle-orm';
import { generateRandomToken } from '$lib/auth/tokens';

const client = createApiTestClient<RequestEvent>(SignoutAPI);

describe('POST /auth/signout', () => {
	let testUserId: string;

	beforeEach(async () => {
		const user = await createTestUser();
		testUserId = user.id;
	});

	it('should revoke a valid refresh token', async () => {
		// 1. Create a "session" in the database
		const token = generateRandomToken();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await db.insert(refreshTokens).values({
			userId: testUserId,
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
