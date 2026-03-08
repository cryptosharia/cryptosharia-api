import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { db } from '$lib/db';
import { authTokens, refreshTokens, users } from '$lib/db/tables';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';
import { AuthPasswordResetPostBody } from '../..';
import { hashOpaqueToken } from '$lib/auth/tokens';

export const POST: RequestHandler = async ({ request }) => {
	const parsedBody = await parseJsonBody(request, AuthPasswordResetPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { token, password } = parsedBody.data;
	const tokenHash = hashOpaqueToken(token);

	try {
		const resetToken = await db.query.authTokens.findFirst({
			where: and(
				eq(authTokens.type, 'password_reset'),
				eq(authTokens.tokenHash, tokenHash),
				gt(authTokens.expiresAt, new Date()),
				isNull(authTokens.revokedAt)
			)
		});

		if (!resetToken) {
			return ApiResponse.notFound('Invalid or expired reset token');
		}

		const passwordHash = await hashPassword(password);
		const now = new Date();

		await db.transaction(async (tx) => {
			await tx.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));

			await tx
				.update(authTokens)
				.set({ revokedAt: now })
				.where(
					and(
						eq(authTokens.userId, resetToken.userId),
						eq(authTokens.type, 'password_reset'),
						isNull(authTokens.revokedAt)
					)
				);

			await tx
				.update(refreshTokens)
				.set({ revokedAt: now })
				.where(and(eq(refreshTokens.userId, resetToken.userId), isNull(refreshTokens.revokedAt)));
		});

		return ApiResponse.ok(undefined, 'Password reset successful');
	} catch (error) {
		console.error('Password reset error:', error);
		return ApiResponse.internalServerError('Failed to reset password');
	}
};
