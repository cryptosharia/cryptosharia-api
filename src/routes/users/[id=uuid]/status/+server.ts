import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { requirePermission } from '$lib/auth/permissions';
import { logUserActivity } from '$lib/services/activity-logger';
import { UsersIdStatusPutBody, UsersIdGetResponse } from '../../index';
import { updateUserStatus } from '$lib/services/users';

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
		const updatedUser = await updateUserStatus({
			id,
			status,
			updatedBy: locals.user!.id
		});

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		const result = UsersIdGetResponse.parse({
			...updatedUser
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
