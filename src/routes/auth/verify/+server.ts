import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { emailVerifications, users } from '$lib/db/tables';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthVerifyPostBody } from '..';

export const POST: RequestHandler = async ({ request }) => {
	const parsedBody = await parseJsonBody(request, AuthVerifyPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { token } = parsedBody.data;

	try {
		const verification = await db.query.emailVerifications.findFirst({
			where: and(
				eq(emailVerifications.token, token),
				gt(emailVerifications.expiresAt, new Date()),
				isNull(emailVerifications.revokedAt)
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
				.update(emailVerifications)
				.set({ revokedAt: new Date() })
				.where(eq(emailVerifications.id, verification.id));
		});

		return ApiResponse.ok(undefined, 'Email verified successfully. You can now sign in.');
	} catch (error) {
		console.error('Verification error:', error);
		return ApiResponse.internalServerError('Failed to verify email address');
	}
};
