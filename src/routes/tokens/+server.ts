import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { Token } from '$lib/db/types';
import ApiResponse from '$lib/api-response';
import { GetTokensParams } from '.';
import z from '$lib/zod-openapi';
import { shariaStatusEnum } from '$lib/db/tables';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate query parameters using Zod
	const params = Object.fromEntries(url.searchParams);
	const result = GetTokensParams.safeParse(params);

	// If validation fails, return a 400 Bad Request
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { shariaStatuses, slugs, search, limit, page, exclude } = result.data;
	const offset = (page - 1) * limit;

	try {
		// 2. Fetch tokens from the database
		const tokensList = await db.query.tokens.findMany({
			where: (tokens, { or, ilike, and, notInArray, inArray }) => {
				const filters = [];

				if (shariaStatuses && shariaStatuses.length > 0) {
					filters.push(
						inArray(
							tokens.shariaStatus,
							shariaStatuses as (typeof shariaStatusEnum.enumValues)[number][]
						)
					);
				}

				if (slugs && slugs.length > 0) {
					filters.push(inArray(tokens.slug, slugs as string[]));
				}

				if (search) {
					const query = `%${search}%`;
					filters.push(
						or(ilike(tokens.name, query), ilike(tokens.ticker, query), ilike(tokens.slug, query))
					);
				}

				if (exclude && (exclude as string[]).length > 0) {
					filters.push(notInArray(tokens.slug, exclude as string[]));
				}

				return filters.length > 0 ? and(...filters) : undefined;
			},
			limit,
			offset,
			orderBy: (tokens, { asc }) => [asc(tokens.rank)]
		});

		// 3. Return the success response
		return ApiResponse.ok<Token[]>(tokensList as Token[]);
	} catch (err) {
		console.error('Error fetching tokens:', err);
		return ApiResponse.internalServerError();
	}
};
