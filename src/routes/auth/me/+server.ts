import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthMeGetResponse } from '.';
import z from '$lib/zod-openapi';

type AuthMeResponse = z.infer<typeof AuthMeGetResponse>;

/**
 * GET /auth/me
 * Get current authenticated user profile.
 */
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Check if user is attached by middleware
	if (!locals.user) {
		return ApiResponse.unauthorized();
	}

	try {
		// 2. Fetch fresh user data from database
		const user = await db.query.users.findFirst({
			where: eq(users.id, locals.user.id)
		});

		if (!user) {
			return ApiResponse.unauthorized();
		}

		// 3. Return response (schema automatically strips sensitive fields)
		return ApiResponse.ok({
			user: AuthMeGetResponse.shape.user.parse(user)
		} as AuthMeResponse);
	} catch (error) {
		console.error('AuthMe error:', error);
		return ApiResponse.internalServerError();
	}
};
