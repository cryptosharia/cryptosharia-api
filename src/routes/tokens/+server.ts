import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { TokensGetQuery, TokensGetItem } from '.';
import { ApiResponse, PaginatedData } from '$lib/api';
import { parseQueryParams } from '$lib/api/request';
import { toAssetMetadata } from '$lib/services/assets';
import { tokens, shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { and, ilike, inArray, notInArray, or, count } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import { hasPermission } from '$lib/auth/permissions';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const parsedQuery = parseQueryParams(url, TokensGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const { shariaStatuses, slugs, search, limit, page, exclude, statuses } = parsedQuery.data;
	const offset = (page - 1) * limit;

	if (statuses && statuses.some((s) => s !== 'published')) {
		if (!hasPermission(locals, 'tokens.manage')) {
			return ApiResponse.forbidden(
				'You do not have permission to access content with the requested statuses.'
			);
		}
	}

	try {
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

			let allowedStatuses = statuses;

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
