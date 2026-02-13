import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, roles } from '$lib/db/tables';
import { UsersIdGetResponse, UsersIdRolePutBody } from '../../index';
import ApiResponse from '$lib/api-response';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/assets';

/**
 * PUT /users/:id/role - Assign role to user
 */
export const PUT: RequestHandler = async ({
	params,
	request,
	locals
}: {
	params: { id: string };
	request: Request;
	locals: App.Locals;
}) => {
	const { id } = params;

	// 1. Authorization
	try {
		requirePermission(locals, 'users.manage_role');
	} catch (apiError) {
		return apiError as Response;
	}

	// 2. Validation
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const result = UsersIdRolePutBody.safeParse(body);
	if (!result.success) {
		return ApiResponse.badRequest(result.error.flatten().fieldErrors);
	}

	const { roleId } = result.data;

	try {
		// 3. Verify role exists (if not null)
		if (roleId) {
			const role = await db.query.roles.findFirst({
				where: eq(roles.id, roleId)
			});
			if (!role) {
				return ApiResponse.notFound('Role not found');
			}
		}

		// 4. Update User
		const [updatedUser] = await db
			.update(users)
			.set({
				roleId,
				updatedAt: new Date(),
				updatedBy: locals.user!.id
			})
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		// Fetch with role for response
		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: { role: true, avatar: true }
		});

		if (!userWithRole) {
			return ApiResponse.notFound('User not found');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...userWithRole,
				avatar: toAssetMetadata(userWithRole.avatar),
				role: userWithRole.role ? userWithRole.role.role : null
			}),
			'Role assigned successfully'
		);
	} catch (error) {
		console.error('Error assigning role:', error);
		return ApiResponse.internalServerError();
	}
};
