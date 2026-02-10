import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthMeGetResponse } from '..';

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
		// 2. Fetch fresh user data with role information
		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, locals.user.id),
			with: {
				role: true
			}
		});

		if (!userWithRole) {
			return ApiResponse.unauthorized();
		}

		// 3. Return response (sanitized via parse)
		return ApiResponse.ok(
			AuthMeGetResponse.parse({
				...userWithRole,
				role: userWithRole.role ? { ...userWithRole.role } : null,
				permissions: locals.user.permissions
			}),
			'User profile retrieved successfully'
		);
	} catch (error) {
		console.error('AuthMe error:', error);
		return ApiResponse.internalServerError();
	}
};
