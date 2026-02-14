import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, userStatusEnum } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import type { PaginatedData } from '$lib/types';
import z from '$lib/zod-openapi';
import { and, ilike, inArray, or, count } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';
import { requirePermission } from '$lib/auth/permissions';
import { toAssetMetadata } from '$lib/assets';
import type { Role } from '$lib/auth/rbac';
import { UsersGetQuery, UsersGetItem } from './index';

/**
 * GET /users - List users with filtering and pagination
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Authorization
	try {
		requirePermission(locals, 'users.read');
	} catch (apiError) {
		return apiError as Response;
	}

	// 2. Validation
	const params = Object.fromEntries(
		Array.from(url.searchParams.keys()).map((key) => [
			key,
			url.searchParams.getAll(key).length > 1
				? url.searchParams.getAll(key)
				: url.searchParams.get(key)
		])
	);
	const result = UsersGetQuery.safeParse(params);

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { search, limit, page, roles, statuses } = result.data;
	const offset = (page - 1) * limit;

	try {
		// 3. Filters
		const filters = [];

		if (roles && roles.length > 0) {
			filters.push(inArray(users.role, roles as Role[]));
		}

		if (statuses && statuses.length > 0) {
			filters.push(inArray(users.status, statuses as (typeof userStatusEnum.enumValues)[number][]));
		}

		if (search) {
			const query = `%${escapeLikePattern(search)}%`;
			filters.push(or(ilike(users.name, query), ilike(users.email, query)));
		}

		const where = filters.length > 0 ? and(...filters) : undefined;

		// 4. Query
		const [usersList, [countResult]] = await Promise.all([
			db.query.users.findMany({
				where,
				limit,
				offset,
				with: {
					avatar: true
				},
				orderBy: (table, { desc }) => [desc(table.createdAt)]
			}),
			db.select({ value: count() }).from(users).where(where)
		]);

		const total = countResult.value;

		return ApiResponse.ok<PaginatedData<UsersGetItem>>(
			{
				items: usersList.map((u) =>
					UsersGetItem.parse({
						...u,
						avatar: toAssetMetadata(u.avatar),
						role: u.role
					})
				),
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Users retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch users error:', error);
		return ApiResponse.internalServerError('Failed to retrieve users');
	}
};
