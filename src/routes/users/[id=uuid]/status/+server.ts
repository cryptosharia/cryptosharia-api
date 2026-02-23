import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/services/assets';
import { logUserActivity } from '$lib/services/activity-logger';
import { UsersIdStatusPutBody, UsersIdGetResponse } from '../../index';

/**
 * PUT /users/:id/status - Update user administrative status
 */
export const PUT: RequestHandler = async (event) => {
	const { params, request, locals } = event;
	const id = params.id;

	const authError = requirePermission(locals, 'users.manage_status');
	if (authError) return authError;

	if (locals.user?.id === id) {
		return ApiResponse.forbidden('You cannot change your own administrative status');
	}

	const parsedBody = await parseJsonBody(request, UsersIdStatusPutBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { status } = parsedBody.data;

	try {
		const [updatedUser] = await db
			.update(users)
			.set({ status, updatedBy: locals.user!.id })
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: { avatar: true }
		});

		if (!userWithRole) {
			return ApiResponse.notFound('User not found after update');
		}

		const result = UsersIdGetResponse.parse({
			...userWithRole,
			avatar: toAssetMetadata(userWithRole.avatar),
			role: userWithRole.role
		});

		await logUserActivity(event, {
			action: 'status.update',
			subjectType: 'user',
			subjectId: id,
			description: `Status changed to ${status}`
		});

		return ApiResponse.ok(result, `User status successfully updated to ${status}`);
	} catch (error) {
		console.error('Update user status error:', error);
		return ApiResponse.internalServerError('Failed to update user status');
	}
};
