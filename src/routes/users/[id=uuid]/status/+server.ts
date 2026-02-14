import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { ApiResponse } from '$lib/api';
import z from '$lib/zod-openapi';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/services/assets';
import { UsersIdStatusPutBody, UsersIdGetResponse } from '../../index';

/**
 * PUT /users/:id/status - Update user administrative status
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const id = params.id;

	// 1. Authorization: users.manage_status
	try {
		requirePermission(locals, 'users.manage_status');
	} catch (apiError) {
		return apiError as Response;
	}

	// 2. Prevent self-modification (Safety)
	if (locals.user?.id === id) {
		return ApiResponse.forbidden('You cannot change your own administrative status');
	}

	// 3. Validation
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const parseResult = UsersIdStatusPutBody.safeParse(body);
	if (!parseResult.success) {
		return ApiResponse.badRequest(z.flattenError(parseResult.error).fieldErrors);
	}

	const { status } = parseResult.data;

	try {
		// 4. Update User Status
		const [updatedUser] = await db
			.update(users)
			.set({ status, updatedBy: locals.user!.id })
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		// Fetch with role for full response
		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: { avatar: true }
		});

		if (!userWithRole) {
			return ApiResponse.notFound('User not found after update');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...userWithRole,
				avatar: toAssetMetadata(userWithRole.avatar),
				role: userWithRole.role
			}),
			`User status successfully updated to ${status}`
		);
	} catch (error) {
		console.error('Update user status error:', error);
		return ApiResponse.internalServerError('Failed to update user status');
	}
};
