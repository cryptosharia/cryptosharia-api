import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { UsersIdGetResponse, UsersIdPatchBody } from '..';
import ApiResponse from '$lib/api-response';
import { eq } from 'drizzle-orm';
import { hasPermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/assets';
import z from '$lib/zod-openapi';

/**
 * GET /users/:id - Get user detail
 */
export const GET: RequestHandler = async ({
	params,
	locals
}: {
	params: { id: string };
	locals: App.Locals;
}) => {
	const { id } = params;

	// 1. Authorization: users.read OR ownership
	const isOwner = locals.user?.id === id;
	const canRead = hasPermission(locals, 'users.read');

	if (!locals.user || (!isOwner && !canRead)) {
		return ApiResponse.forbidden('Insufficient permissions');
	}

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
			with: {
				role: true,
				avatar: true
			}
		});

		if (!user) {
			return ApiResponse.notFound('User not found');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...user,
				avatar: toAssetMetadata(user.avatar),
				role: user.role ? user.role.role : null
			}),
			'User details retrieved successfully'
		);
	} catch (error) {
		console.error('Error fetching user detail:', error);
		return ApiResponse.internalServerError();
	}
};

/**
 * PATCH /users/:id - Update user
 */
export const PATCH: RequestHandler = async ({
	params,
	request,
	locals
}: {
	params: { id: string };
	request: Request;
	locals: App.Locals;
}) => {
	const { id } = params;

	// 1. Authorization: users.update OR ownership
	const isOwner = locals.user?.id === id;
	const canUpdate = hasPermission(locals, 'users.update');

	if (!locals.user || (!isOwner && !canUpdate)) {
		return ApiResponse.forbidden('Insufficient permissions');
	}

	// 2. Validation
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const result = UsersIdPatchBody.safeParse(body);
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { name, avatarId } = result.data;

	try {
		const [updatedUser] = await db
			.update(users)
			.set({
				name,
				avatarId,
				updatedAt: new Date(),
				updatedBy: locals.user.id
			})
			.where(eq(users.id, id))
			.returning();

		if (!updatedUser) {
			return ApiResponse.notFound('User not found');
		}

		// Fetch with role for response
		const userWithRole = await db.query.users.findFirst({
			where: eq(users.id, updatedUser.id),
			with: {
				role: true,
				avatar: true
			}
		});

		if (!userWithRole) {
			return ApiResponse.notFound('User not found after update');
		}

		return ApiResponse.ok(
			UsersIdGetResponse.parse({
				...userWithRole,
				avatar: toAssetMetadata(userWithRole.avatar),
				role: userWithRole.role ? userWithRole.role.role : null
			}),
			'User updated successfully'
		);
	} catch (error) {
		console.error('Error updating user:', error);
		return ApiResponse.internalServerError();
	}
};
