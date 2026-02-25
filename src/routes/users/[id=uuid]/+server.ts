import type { RequestHandler } from './$types';
import { UsersIdGetResponse, UsersIdPatchBody } from '..';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { hasPermission } from '$lib/auth/permissions';
import { logUserActivity } from '$lib/services/activity-logger';
import { getUserDetail, updateUserProfile } from '$lib/services/users';

/**
 * GET /users/:id - Get user detail
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { id } = params;

	const isOwner = locals.user?.id === id;
	const canRead = hasPermission(locals, 'users.read');

	if (!locals.user) {
		return ApiResponse.unauthorized();
	}

	if (!isOwner && !canRead) {
		return ApiResponse.forbidden('Insufficient permissions');
	}

	try {
		const user = await getUserDetail(id);

		if (!user) {
			return ApiResponse.notFound('User not found');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...user
			}),
			'User details retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch user error:', error);
		return ApiResponse.internalServerError('Failed to retrieve user details');
	}
};

/**
 * PATCH /users/:id - Update user
 */
export const PATCH: RequestHandler = async (event) => {
	const { params, request, locals } = event;
	const { id } = params;

	const isOwner = locals.user?.id === id;
	const canUpdate = hasPermission(locals, 'users.update');

	if (!locals.user) {
		return ApiResponse.unauthorized();
	}

	if (!isOwner && !canUpdate) {
		return ApiResponse.forbidden('Insufficient permissions');
	}

	const parsedBody = await parseJsonBody(request, UsersIdPatchBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { name, avatarId } = parsedBody.data;

	try {
		const updatedUser = await updateUserProfile({
			id,
			name,
			avatarId,
			updatedBy: locals.user.id
		});

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		const result = UsersIdGetResponse.parse({
			...updatedUser
		});

		await logUserActivity(event, {
			action: 'user.update',
			subjectType: 'user',
			subjectId: id,
			description: `Updated user profile`
		});

		return ApiResponse.ok(result, 'User updated successfully');
	} catch (error) {
		console.error('Update user error:', error);
		return ApiResponse.internalServerError('Failed to update user profile');
	}
};
