import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthRefreshPostBody, AuthRefreshPostResponse } from '..';
import { signAccessToken, createRefreshToken } from '$lib/auth/tokens';

/**
 * POST /auth/refresh
 * Rotate refresh token and issue new access token.
 */
export const POST: RequestHandler = async ({ request }) => {
	const parsedBody = await parseJsonBody(request, AuthRefreshPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { refreshToken: oldToken } = parsedBody.data;

	try {
		const storedToken = await db.query.refreshTokens.findFirst({
			where: and(
				eq(refreshTokens.token, oldToken),
				isNull(refreshTokens.revokedAt),
				gt(refreshTokens.expiresAt, new Date())
			),
			with: {
				user: true
			}
		});

		if (!storedToken || !storedToken.user) {
			return ApiResponse.unauthorized('Invalid or expired refresh token');
		}

		const user = storedToken.user;

		if (user.status !== 'active') {
			return ApiResponse.forbidden('Your account is not active. Please contact support.');
		}

		const accessToken = await signAccessToken({
			userId: user.id,
			role: user.role
		});

		const refreshToken = createRefreshToken(user.id);

		await db.transaction(async (tx) => {
			await tx
				.update(refreshTokens)
				.set({ revokedAt: new Date() })
				.where(eq(refreshTokens.token, oldToken));

			await tx.insert(refreshTokens).values(refreshToken);
		});

		return ApiResponse.ok(
			AuthRefreshPostResponse.parse({
				user,
				accessToken,
				refreshToken: refreshToken.token
			}),
			'Token refreshed successfully'
		);
	} catch (error) {
		console.error('Refresh error:', error);
		return ApiResponse.internalServerError('Failed to refresh authentication token');
	}
};
