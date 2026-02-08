import { describe, it, expect, beforeEach } from 'vitest';
import * as SigninAPI from './+server';
import { db } from '$lib/db';
import { users, refreshTokens } from '$lib/db/tables';
import { createApiTestClient } from '$lib/test-utils';
import { hashPassword } from '$lib/auth/password';
import type { RequestEvent } from './$types';
import { eq } from 'drizzle-orm';

const client = createApiTestClient<RequestEvent>(SigninAPI);

describe('POST /auth/signin', () => {
	const testPassword = 'testPassword123';
	let testUserId: string;

	beforeEach(async () => {
		// Clean up and setup fresh user for each test
		await db.delete(refreshTokens);

		// Create a test user with known credentials
		const hashedPassword = await hashPassword(testPassword);
		const [user] = await db
			.insert(users)
			.values({
				email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
				name: 'Test User',
				hashedPassword
			})
			.returning();
		testUserId = user.id;
	});

	it('should return tokens and user info on successful signin', async () => {
		// Get the user we just created
		const user = await db.query.users.findFirst({
			where: eq(users.id, testUserId)
		});

		const { data, response } = await client.POST('/auth/signin', {
			body: {
				email: user!.email,
				password: testPassword
			}
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.data?.user.id).toBe(user!.id);
		expect(data?.data?.user.email).toBe(user!.email);
		expect(data?.data?.accessToken).toBeDefined();
		expect(data?.data?.refreshToken).toBeDefined();
		// Sensitive fields should be stripped
		expect((data?.data?.user as Record<string, unknown>).hashedPassword).toBeUndefined();
	});

	it('should return 401 for invalid email', async () => {
		const { error, response } = await client.POST('/auth/signin', {
			body: {
				email: 'nonexistent@example.com',
				password: 'anyPassword123'
			}
		});

		expect(response.status).toBe(401);
		expect(error?.success).toBe(false);
	});

	it('should return 401 for invalid password', async () => {
		const user = await db.query.users.findFirst({
			where: eq(users.id, testUserId)
		});

		const { error, response } = await client.POST('/auth/signin', {
			body: {
				email: user!.email,
				password: 'wrongPassword123'
			}
		});

		expect(response.status).toBe(401);
		expect(error?.success).toBe(false);
	});

	it('should return 400 for invalid email format', async () => {
		const { response } = await client.POST('/auth/signin', {
			body: {
				email: 'not-an-email',
				password: 'somePassword123'
			}
		});

		expect(response.status).toBe(400);
	});

	it('should return 400 for short password', async () => {
		const { response } = await client.POST('/auth/signin', {
			body: {
				email: 'valid@email.com',
				password: 'short'
			}
		});

		expect(response.status).toBe(400);
	});

	it('should store refresh token in database on successful signin', async () => {
		const user = await db.query.users.findFirst({
			where: eq(users.id, testUserId)
		});

		await client.POST('/auth/signin', {
			body: {
				email: user!.email,
				password: testPassword
			}
		});

		// Check database
		const storedTokens = await db.query.refreshTokens.findMany({
			where: eq(refreshTokens.userId, testUserId)
		});

		expect(storedTokens).toHaveLength(1);
		expect(storedTokens[0].userId).toBe(testUserId);
		expect(storedTokens[0].expiresAt).toBeDefined();
		expect(storedTokens[0].revokedAt).toBeNull();
	});
});
