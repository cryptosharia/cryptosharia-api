import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { authTokens, users } from '$lib/db/tables';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthVerifyPostBody } from '..';
import { hashOpaqueToken } from '$lib/auth/tokens';
import { logActivity } from '$lib/services/activity-logger';

export const POST: RequestHandler = async ({ request, locals }) => {
	const parsedBody = await parseJsonBody(request, AuthVerifyPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { token } = parsedBody.data;
	const tokenHash = hashOpaqueToken(token);

	try {
		const verification = await db.query.authTokens.findFirst({
			where: and(
				eq(authTokens.type, 'email_verification'),
				eq(authTokens.tokenHash, tokenHash),
				gt(authTokens.expiresAt, new Date()),
				isNull(authTokens.revokedAt)
			)
		});

		if (!verification) {
			return ApiResponse.notFound('Invalid or expired verification token');
		}

		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					isEmailVerified: true
				})
				.where(eq(users.id, verification.userId));

			await tx
				.update(authTokens)
				.set({ revokedAt: new Date() })
				.where(eq(authTokens.id, verification.id));
		});

		await logActivity({
			userId: verification.userId,
			action: 'auth.verify',
			subjectType: 'auth',
			description: 'Email verification completed',
			ipAddress: locals.clientIp
		});

		return ApiResponse.ok(undefined, 'Email verified successfully. You can now sign in.');
	} catch (error) {
		console.error('Verification error:', error);
		return ApiResponse.internalServerError('Failed to verify email address');
	}
};
