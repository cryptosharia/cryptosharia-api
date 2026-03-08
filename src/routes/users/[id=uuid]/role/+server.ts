import type { RequestHandler } from './$types';
import { userRoleEnum } from '$lib/db/tables';
import { UsersIdGetResponse, UsersIdRolePutBody } from '../../index';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { requirePermission } from '$lib/auth/permissions';
import { logUserActivity } from '$lib/services/activity-logger';
import type { Role } from '$lib/auth/rbac';
import { updateUserRole } from '$lib/services/users';

/**
 * PUT /users/:id/role - Assign role to user
 */
export const PUT: RequestHandler = async (event) => {
	const { params, request, locals } = event;
	const { id } = params;

	const authError = requirePermission(locals, 'users.manage_role');
	if (authError) return authError;

	const parsedBody = await parseJsonBody(request, UsersIdRolePutBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { role } = parsedBody.data;

	try {
		if (role && !userRoleEnum.enumValues.includes(role as Role)) {
			return ApiResponse.badRequest({ role: ['Invalid role'] });
		}

		const updatedUser = await updateUserRole({
			id,
			role: role as Role,
			updatedBy: locals.user!.id
		});

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		const result = UsersIdGetResponse.parse({
			...updatedUser
		});

		await logUserActivity(event, {
			action: 'user.role.update',
			subjectType: 'user',
			subjectId: id,
			description: `Role changed to ${role ?? 'null (regular user)'}`
		});

		return ApiResponse.ok(result, 'Role assigned successfully');
	} catch (error) {
		console.error('Update user role error:', error);
		return ApiResponse.internalServerError('Failed to update user role');
	}
};
