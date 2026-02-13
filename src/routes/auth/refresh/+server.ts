import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { eq, and, isNull, gt } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthRefreshPostBody, AuthRefreshPostResponse } from '..';
import { signAccessToken, createRefreshToken } from '$lib/auth/tokens';
import z from '$lib/zod-openapi';

/**
 * POST /auth/refresh
 * Rotate refresh token and issue new access token.
 */
export const POST: RequestHandler = async ({ request }) => {
	// 1. Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const result = AuthRefreshPostBody.safeParse(body);
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { refreshToken: oldToken } = result.data;

	try {
		// 2. Find and validate old token
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

		// 3. Rotate refresh token (Security: One-time use)
		// Revoke the old one
		await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(eq(refreshTokens.token, oldToken));

		// Generate a new access token
		const accessToken = await signAccessToken({
			userId: user.id,
			role: user.role
		});

		// Generate a new opaque refresh token
		const refreshToken = createRefreshToken(user.id);

		// Store the new refresh token
		await db.insert(refreshTokens).values(refreshToken);

		// 4. Return response
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
