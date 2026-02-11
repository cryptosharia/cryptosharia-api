import { db } from '$lib/db';
import { emailVerifications, users } from '$lib/db/tables';
import { eq, and, gt, isNull } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthVerifyPostBody } from '..';
import type { RequestHandler } from './$types';
import z from '$lib/zod-openapi';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	// 1. Validation
	const parseResult = AuthVerifyPostBody.safeParse(body);
	if (!parseResult.success) {
		return ApiResponse.badRequest(z.flattenError(parseResult.error).fieldErrors);
	}

	const { token } = parseResult.data;

	try {
		// 2. Find valid token
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

		// 3. Atomically verify user and revoke token
		await db.transaction(async (tx) => {
			// Mark user as verified
			await tx
				.update(users)
				.set({
					isEmailVerified: true
				})
				.where(eq(users.id, verification.userId));

			// Revoke used token (one-time use policy)
			await tx
				.update(emailVerifications)
				.set({ revokedAt: new Date() })
				.where(eq(emailVerifications.id, verification.id));
		});

		return ApiResponse.ok(undefined, 'Email verified successfully. You can now sign in.');
	} catch (error) {
		console.error('Verification error:', error);
		return ApiResponse.internalServerError();
	}
};
