import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { toAssetMetadata } from '$lib/services/assets';
import { AuthMeGetResponse } from '..';

/**
 * GET /auth/me
 * Get current authenticated user profile.
 */
export const GET: RequestHandler = async ({ locals }) => {
	// 1. Check if user is attached by middleware
	if (!locals.user) {
		return ApiResponse.unauthorized('Not authenticated');
	}

	try {
		// 2. Fetch fresh user data with role information
		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, locals.user.id),
			with: {
				avatar: true
			}
		});

		if (!userWithRole) {
			return ApiResponse.unauthorized('User session not found');
		}

		// 3. Return response (sanitized via parse)
		return ApiResponse.ok(
			AuthMeGetResponse.parse({
				...userWithRole,
				avatar: toAssetMetadata(userWithRole.avatar),
				role: userWithRole.role,
				permissions: locals.user.permissions
			}),
			'User profile retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch me error:', error);
		return ApiResponse.internalServerError('Failed to retrieve user profile');
	}
};
