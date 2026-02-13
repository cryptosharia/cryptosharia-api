import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, userRoleEnum } from '$lib/db/tables';
import { UsersIdGetResponse, UsersIdRolePutBody } from '../../index';
import ApiResponse from '$lib/api-response';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/assets';
import type { Role } from '$lib/auth/rbac';

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
		requirePermission(locals, 'users.manage_roles');
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

	const { role } = result.data;

	try {
		// 3. Verify role exists in enum (if not null)
		if (role && !userRoleEnum.enumValues.includes(role as Role)) {
			return ApiResponse.badRequest({ role: ['Invalid role'] });
		}

		// 4. Update User
		const [updatedUser] = await db
			.update(users)
			.set({
				role: role as Role,
				updatedAt: new Date(),
				updatedBy: locals.user!.id
			})
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		// Fetch for response
		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: { avatar: true }
		});

		if (!user) {
			return ApiResponse.notFound('User not found');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...user,
				avatar: toAssetMetadata(user.avatar),
				role: user.role
			}),
			'Role assigned successfully'
		);
	} catch (error) {
		console.error('Error assigning role:', error);
		return ApiResponse.internalServerError();
	}
};
