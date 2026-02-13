import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthSignoutPostBody } from '..';
import z from '$lib/zod-openapi';

/**
 * POST /auth/signout
 * Revoke a refresh token.
 */
export const POST: RequestHandler = async ({ request }) => {
	// 1. Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const result = AuthSignoutPostBody.safeParse(body);
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { refreshToken } = result.data;

	try {
		// 2. Revoke the token in the database
		// We only target tokens that haven't been revoked yet
		const [revokedToken] = await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(and(eq(refreshTokens.token, refreshToken), isNull(refreshTokens.revokedAt)))
			.returning();

		// We return success even if no token was found/revoked to keep it idempotent
		return ApiResponse.ok(
			undefined,
			revokedToken ? 'Signed out successfully' : 'Session already ended or invalid'
		);
	} catch (error) {
		console.error('Signout error:', error);
		return ApiResponse.internalServerError('Failed to sign out');
	}
};
