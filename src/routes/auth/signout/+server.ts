import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { refreshTokens } from '$lib/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthSignoutPostBody } from '..';
import { logActivity } from '$lib/services/activity-logger';

/**
 * POST /auth/signout
 * Revoke a refresh token.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsedBody = await parseJsonBody(request, AuthSignoutPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { refreshToken } = parsedBody.data;

	try {
		const [revokedToken] = await db
			.update(refreshTokens)
			.set({ revokedAt: new Date() })
			.where(and(eq(refreshTokens.token, refreshToken), isNull(refreshTokens.revokedAt)))
			.returning();

		if (revokedToken?.userId) {
			await logActivity({
				userId: revokedToken.userId,
				action: 'auth.signout',
				subjectType: 'auth',
				description: 'Refresh token revoked via signout',
				ipAddress: locals.clientIp
			});
		}

		return ApiResponse.ok(
			undefined,
			revokedToken ? 'Signed out successfully' : 'Session already ended or invalid'
		);
	} catch (error) {
		console.error('Signout error:', error);
		return ApiResponse.internalServerError('Failed to sign out');
	}
};
