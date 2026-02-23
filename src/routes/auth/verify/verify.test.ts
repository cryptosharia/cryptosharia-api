import { describe, it, expect } from 'vitest';
import { createApiTestClient } from '$lib/test-utils';
import { db } from '$lib/db';
import { users, emailVerifications } from '$lib/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';

describe('POST /auth/verify', () => {
	const client = createApiTestClient();

	const signup = (body: { name: string; email: string; password: string }) =>
		client.POST('/auth/signup', {
			params: { query: { notify: false } },
			body
		});

	async function createVerificationToken(userId: string, token: string, hourOffset: number) {
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + hourOffset);

		await db.insert(emailVerifications).values({
			userId,
			token,
			expiresAt
		});
	}

	it('should verify a user successfully with a valid token', async () => {
		// 1. Setup: Create an unverified user and a token
		const password = 'password-length-12';
		const email = 'verify-me@example.com';
		const [user] = await db
			.insert(users)
			.values({
				name: 'Verify Me',
				email,
				hashedPassword: await hashPassword(password),
				isEmailVerified: false
			})
			.returning();

		const token = 'valid-token-123';
		await createVerificationToken(user.id, token, 6);

		// 2. Execute Verification
		const { data, response } = await client.POST('/auth/verify', {
			body: { token }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);

		// 3. Verify DB state
		const updatedUser = await db.query.users.findFirst({
			where: eq(users.id, user.id)
		});
		expect(updatedUser?.isEmailVerified).toBe(true);

		// 4. Token should be revoked (not deleted)
		const storedToken = await db.query.emailVerifications.findFirst({
			where: eq(emailVerifications.token, token)
		});
		expect(storedToken).toBeDefined();
		expect(storedToken?.revokedAt).not.toBeNull();
	});

	it('should return 404 for non-existent token', async () => {
		const { response, error } = await client.POST('/auth/verify', {
			body: { token: 'non-existent' }
		});

		expect(response.status).toBe(404);
		expect(error?.success).toBe(false);
	});

	it('should return 404 for expired token', async () => {
		const [user] = await db
			.insert(users)
			.values({
				name: 'Expired Test',
				email: 'expired@example.com',
				hashedPassword: 'hash',
				isEmailVerified: false
			})
			.returning();

		const token = 'expired-token';
		await createVerificationToken(user.id, token, -1);

		const { response } = await client.POST('/auth/verify', {
			body: { token }
		});

		expect(response.status).toBe(404);
	});

	it('should block signin until verified', async () => {
		const email = 'blocked-signin@example.com';
		const password = 'password-length-12';

		// 1. Signup (unverified)
		await signup({ name: 'Blocked', email, password });

		// 2. Attempt Signin -> Should fail (mask as unauthorized/not found)
		const signinRes = await client.POST('/auth/signin', {
			body: { email, password }
		});
		expect(signinRes.response.status).toBe(401);

		// 3. Get token from DB
		const ver = await db.query.emailVerifications.findFirst();
		expect(ver).toBeDefined();

		// 4. Verify
		await client.POST('/auth/verify', {
			body: { token: ver!.token }
		});

		const signinRes2 = await client.POST('/auth/signin', {
			body: { email, password }
		});
		expect(signinRes2.response.status).toBe(200);
		expect(signinRes2.data?.data?.accessToken).toBeDefined();
	});

	it('should revoke previous tokens when a new one is generated (Multiple Signups)', async () => {
		const email = 'multi@example.com';
		const password = 'password-length-12';

		// 1. First Signup
		await signup({ name: 'Multi', email, password });

		const user = await db.query.users.findFirst({ where: eq(users.email, email) });
		const token1 = await db.query.emailVerifications.findFirst({
			where: eq(emailVerifications.userId, user!.id)
		});
		expect(token1).toBeDefined();
		expect(token1?.revokedAt).toBeNull();

		// 2. Second Signup (Graceful)
		await signup({ name: 'Multi Updated', email, password });

		// 3. Verify Token 1 is now revoked
		const token1Refetched = await db.query.emailVerifications.findFirst({
			where: eq(emailVerifications.id, token1!.id)
		});
		expect(token1Refetched?.revokedAt).not.toBeNull();

		// 4. Verify a new Token 2 exists and is active
		// Since we insert a new one, we search by userId and isNull(revokedAt)
		const activeToken = await db.query.emailVerifications.findFirst({
			where: and(
				eq(emailVerifications.userId, token1!.userId),
				isNull(emailVerifications.revokedAt)
			)
		});
		expect(activeToken).toBeDefined();
		expect(activeToken?.id).not.toBe(token1!.id);
	});
});
