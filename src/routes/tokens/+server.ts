import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { TokensGetQuery, TokensGetItem } from '.';
import { ApiResponse, PaginatedData } from '$lib/api';
import z from '$lib/zod-openapi';
import { toAssetMetadata } from '$lib/services/assets';
import { tokens, shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { and, ilike, inArray, notInArray, or, count } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import { hasPermission } from '$lib/auth/permissions';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// 1. Validate query parameters using Zod
	const params = Object.fromEntries(
		Array.from(url.searchParams.keys()).map((key) => [
			key,
			url.searchParams.getAll(key).length > 1
				? url.searchParams.getAll(key)
				: url.searchParams.get(key)
		])
	);
	const result = TokensGetQuery.safeParse(params);

	// If validation fails, return a 400 Bad Request
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { shariaStatuses, slugs, search, limit, page, exclude, statuses } = result.data;
	const offset = (page - 1) * limit;

	// 2. Security Check: If non-published statuses are explicitly requested, require permission
	if (statuses && statuses.some((s) => s !== 'published')) {
		if (!hasPermission(locals, 'tokens.manage')) {
			return ApiResponse.forbidden(
				'You do not have permission to access content with the requested statuses.'
			);
		}
	}

	try {
		// 3. Define filters for the query
		const getFilters = (table: typeof tokens) => {
			const filters = [];

			if (shariaStatuses && shariaStatuses.length > 0) {
				filters.push(
					inArray(
						table.shariaStatus,
						shariaStatuses as (typeof shariaStatusEnum.enumValues)[number][]
					)
				);
			}

			if (slugs && slugs.length > 0) {
				filters.push(inArray(table.slug, slugs as string[]));
			}

			if (search) {
				const query = `%${escapeLikePattern(search)}%`;
				filters.push(
					or(ilike(table.name, query), ilike(table.ticker, query), ilike(table.slug, query))
				);
			}

			if (exclude && (exclude as string[]).length > 0) {
				filters.push(notInArray(table.slug, exclude as string[]));
			}

			// 🔓 Filter by status
			let allowedStatuses = statuses;

			// If no status filter is provided and not staff, default to 'published'
			if (!allowedStatuses && !hasPermission(locals, 'tokens.manage')) {
				allowedStatuses = ['published'];
			}

			if (allowedStatuses && allowedStatuses.length > 0) {
				filters.push(
					inArray(table.status, allowedStatuses as (typeof contentStatusEnum.enumValues)[number][])
				);
			}

			return filters.length > 0 ? and(...filters) : undefined;
		};

		// 3. Fetch data and count in parallel
		const [tokensList, [countResult]] = await Promise.all([
			db.query.tokens.findMany({
				where: getFilters(tokens),
				limit,
				offset,
				columns: {
					content: false,
					logoId: false
				},
				with: {
					logo: true,
					createdBy: {
						columns: {
							id: true,
							name: true,
							email: true
						}
					},
					updatedBy: {
						columns: {
							id: true,
							name: true,
							email: true
						}
					}
				},
				orderBy: (table, { asc }) => [asc(table.rank)]
			}),
			db.select({ value: count() }).from(tokens).where(getFilters(tokens))
		]);

		const total = countResult.value;

		// 4. Return the paginated success response
		return ApiResponse.ok<PaginatedData<TokensGetItem>>(
			{
				items: tokensList.map((t) =>
					TokensGetItem.parse({
						...t,
						logo: toAssetMetadata(t.logo)
					})
				),
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Tokens retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch tokens error:', error);
		return ApiResponse.internalServerError('Failed to retrieve tokens');
	}
};
