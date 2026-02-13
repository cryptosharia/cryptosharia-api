import { describe, it, expect } from 'vitest';
import { createApiTestClient } from '$lib/test-utils';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { eq } from 'drizzle-orm';

describe('POST /auth/signup', () => {
	const client = createApiTestClient();
	const signupData = {
		name: 'John Doe',
		email: 'john@example.com',
		password: 'password-length-12'
	};

	it('should register a new user successfully with correct defaults', async () => {
		const { data, response } = await client.POST('/auth/signup', {
			body: signupData
		});

		expect(response.status).toBe(201);
		expect(data?.success).toBe(true);

		if (data?.success && data.data) {
			const userRes = data.data;
			expect(userRes.email).toBe(signupData.email);
			expect(userRes.name).toBe(signupData.name);
			expect(userRes.id).toBeDefined();

			// Security Check: Ensure tokens are NOT leaked (Email Verification must come first)
			expect(userRes).not.toHaveProperty('accessToken');
			expect(userRes).not.toHaveProperty('refreshToken');
		}

		// Verify DB state
		const user = await db.query.users.findFirst({
			where: eq(users.email, signupData.email)
		});
		expect(user).toBeDefined();
		expect(user?.role).toBeNull();
		expect(user?.isEmailVerified).toBe(false);
	});

	it('should trim whitespace from user name before saving', async () => {
		const email = 'trim@example.com';
		await client.POST('/auth/signup', {
			body: { ...signupData, email, name: '  Trimmed Name  ' }
		});

		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});
		expect(user?.name).toBe('Trimmed Name');
	});

	it('should allow re-registration for unverified emails (Graceful Re-registration)', async () => {
		const email = 'graceful@example.com';
		// 1. Initial Signup
		const res1 = await client.POST('/auth/signup', {
			body: { ...signupData, email }
		});
		expect(res1.response.status).toBe(201);

		// 2. Second signup (unverified) should update the account (password, name)
		const res2 = await client.POST('/auth/signup', {
			body: { ...signupData, email, name: 'John Updated' }
		});

		expect(res2.response.status).toBe(201);
		expect(res2.data?.success).toBe(true);

		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});
		expect(user?.name).toBe('John Updated');
	});

	it('should return 409 for duplicate registration of a VERIFIED email', async () => {
		const email = 'strict@example.com';
		// 1. Signup
		await client.POST('/auth/signup', {
			body: { ...signupData, email }
		});

		// 2. Force verify in DB
		await db.update(users).set({ isEmailVerified: true }).where(eq(users.email, email));

		// 3. Fail on second signup
		const { response, error } = await client.POST('/auth/signup', {
			body: { ...signupData, email }
		});

		expect(response.status).toBe(409);
		expect(error?.success).toBe(false);
		expect(error?.message).toBe('Email already registered');
	});

	it('should ignore extra fields during signup (Mass Assignment protection)', async () => {
		const email = 'mass@example.com';
		await client.POST('/auth/signup', {
			body: {
				...signupData,
				email,
				role: 'super_admin',
				isEmailVerified: true
			}
		});

		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});
		expect(user?.role).toBeNull();
		expect(user?.isEmailVerified).toBe(false);
	});
});