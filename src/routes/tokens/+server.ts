import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { TokensGetQuery, TokensGetItem } from '.';
import ApiResponse from '$lib/api-response';
import { PaginatedData } from '$lib/types';
import z from '$lib/zod-openapi';
import { toAssetMetadata } from '$lib/assets';
import { tokens, shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { and, ilike, inArray, notInArray, or, count } from 'drizzle-orm';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
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

	try {
		// 2. Define filters for the query
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
				const query = `%${search}%`;
				filters.push(
					or(ilike(table.name, query), ilike(table.ticker, query), ilike(table.slug, query))
				);
			}

			if (exclude && (exclude as string[]).length > 0) {
				filters.push(notInArray(table.slug, exclude as string[]));
			}

			// 🔓 Filter by status (default to published for safety)
			const statusesToFilter = (
				statuses && statuses.length > 0 ? statuses : ['published']
			) as (typeof contentStatusEnum.enumValues)[number][];
			filters.push(inArray(table.status, statusesToFilter));

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
	} catch (err) {
		console.error('Error fetching tokens:', err);
		return ApiResponse.internalServerError();
	}
};
