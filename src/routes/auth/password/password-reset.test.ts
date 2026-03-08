import { describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { createApiTestClient } from '$lib/test-utils';
import { db } from '$lib/db';
import { authTokens, refreshTokens, users } from '$lib/db/tables';
import { hashPassword } from '$lib/auth/password';
import { createRefreshToken, hashOpaqueToken } from '$lib/auth/tokens';

describe('Auth Password Reset', () => {
	const client = createApiTestClient();

	it('should return generic success for non-existent email on forgot', async () => {
		const { response, data } = await client.POST('/auth/password/forgot', {
			body: { email: 'not-found@example.com' }
		});

		expect(response.status).toBe(200);
		expect(data?.success).toBe(true);
		expect(data?.message).toBe('If your email is registered, a reset link has been sent');
	});

	it('should return 404 for invalid reset token', async () => {
		const { response } = await client.POST('/auth/password/reset', {
			body: {
				token: 'invalid-reset-token',
				password: 'new-password-123'
			}
		});

		expect(response.status).toBe(404);
	});

	it('should reset password and revoke all active refresh tokens', async () => {
		const email = 'reset-success@example.com';
		const oldPassword = 'password-length-12';
		const newPassword = 'new-password-123';

		const [user] = await db
			.insert(users)
			.values({
				name: 'Reset Success',
				email,
				passwordHash: await hashPassword(oldPassword),
				isEmailVerified: true
			})
			.returning();

		const refreshA = createRefreshToken(user.id);
		const refreshB = createRefreshToken(user.id);
		await db.insert(refreshTokens).values([refreshA, refreshB]);

		const plainResetToken = 'reset-token-success-123';
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + 30);

		const [resetToken] = await db
			.insert(authTokens)
			.values({
				userId: user.id,
				type: 'password_reset',
				tokenHash: hashOpaqueToken(plainResetToken),
				expiresAt
			})
			.returning();

		const { response } = await client.POST('/auth/password/reset', {
			body: {
				token: plainResetToken,
				password: newPassword
			}
		});

		expect(response.status).toBe(200);

		const updatedToken = await db.query.authTokens.findFirst({
			where: eq(authTokens.id, resetToken.id)
		});
		expect(updatedToken?.revokedAt).not.toBeNull();

		const activeRefresh = await db.query.refreshTokens.findMany({
			where: and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt))
		});
		expect(activeRefresh).toHaveLength(0);

		const oldSignin = await client.POST('/auth/signin', {
			body: { email, password: oldPassword }
		});
		expect(oldSignin.response.status).toBe(401);

		const newSignin = await client.POST('/auth/signin', {
			body: { email, password: newPassword }
		});
		expect(newSignin.response.status).toBe(200);
	});
});
