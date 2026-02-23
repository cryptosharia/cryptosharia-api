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

	const signup = (
		body: { name: string; email: string; password: string } & Record<string, unknown>
	) =>
		client.POST('/auth/signup', {
			params: { query: { notify: false } },
			body
		});

	const getUserByEmail = (email: string) =>
		db.query.users.findFirst({
			where: eq(users.email, email)
		});

	it('should register a new user successfully with correct defaults', async () => {
		const { data, response } = await signup(signupData);

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
		const user = await getUserByEmail(signupData.email);
		expect(user).toBeDefined();
		expect(user?.role).toBe('member');
		expect(user?.isEmailVerified).toBe(false);
	});

	it('should trim whitespace from user name before saving', async () => {
		const email = 'trim@example.com';
		await signup({ ...signupData, email, name: '  Trimmed Name  ' });

		const user = await getUserByEmail(email);
		expect(user?.name).toBe('Trimmed Name');
	});

	it('should allow re-registration for unverified emails (Graceful Re-registration)', async () => {
		const email = 'graceful@example.com';
		// 1. Initial Signup
		const res1 = await signup({ ...signupData, email });
		expect(res1.response.status).toBe(201);

		// 2. Second signup (unverified) should update the account (password, name)
		const res2 = await signup({ ...signupData, email, name: 'John Updated' });

		expect(res2.response.status).toBe(201);
		expect(res2.data?.success).toBe(true);

		const user = await getUserByEmail(email);
		expect(user?.name).toBe('John Updated');
	});

	it('should return 409 for duplicate registration of a VERIFIED email', async () => {
		const email = 'strict@example.com';
		// 1. Signup
		await signup({ ...signupData, email });

		// 2. Force verify in DB
		await db.update(users).set({ isEmailVerified: true }).where(eq(users.email, email));

		// 3. Fail on second signup
		const { response, error } = await signup({ ...signupData, email });

		expect(response.status).toBe(409);
		expect(error?.success).toBe(false);
		expect(error?.message).toBe('Email already registered');
	});

	it('should ignore extra fields during signup (Mass Assignment protection)', async () => {
		const email = 'mass@example.com';
		await signup({
			...signupData,
			email,
			role: 'super_admin',
			isEmailVerified: true
		});

		const user = await getUserByEmail(email);
		expect(user?.role).toBe('member');
		expect(user?.isEmailVerified).toBe(false);
	});
});
