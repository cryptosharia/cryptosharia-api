import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, userRoleEnum } from '$lib/db/tables';
import { UsersIdGetResponse, UsersIdRolePutBody } from '../../index';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/services/assets';
import { logUserActivity } from '$lib/services/activity-logger';
import type { Role } from '$lib/auth/rbac';

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

		const [updatedUser] = await db
			.update(users)
			.set({
				role: role as Role,
				updatedBy: locals.user!.id
			})
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: { avatar: true }
		});

		if (!user) {
			return ApiResponse.notFound('User not found');
		}

		const result = UsersIdGetResponse.parse({
			...user,
			avatar: toAssetMetadata(user.avatar),
			role: user.role
		});

		await logUserActivity(event, {
			action: 'role.update',
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
