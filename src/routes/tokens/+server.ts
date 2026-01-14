import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { ApiResponse, Token } from '$lib/types';
import { GetTokensParams } from '.';
import z from '$lib/zod-openapi';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate query parameters using Zod
	const result = GetTokensParams.safeParse(Object.fromEntries(url.searchParams));

	// If validation fails, return a 400 Bad Request
	if (!result.success) {
		return Response.json(
			{
				success: false,
				message: 'Invalid query parameters',
				errors: z.flattenError(result.error).fieldErrors
			} satisfies ApiResponse<undefined>,
			{ status: 400 }
		);
	}

	const { status, search, limit, page, exclude } = result.data;
	const offset = (page - 1) * limit;

	// 2. Fetch tokens from the database
	const tokens = await db.query.tokens.findMany({
		where: (tokens, { eq, or, ilike, and, notInArray }) => {
			const filters = [];

			if (status !== 'all') {
				filters.push(eq(tokens.status, status));
			}

			if (search) {
				const query = `%${search}%`;
				filters.push(
					or(ilike(tokens.name, query), ilike(tokens.ticker, query), ilike(tokens.slug, query))
				);
			}

			if (exclude) {
				const excludedSlugs = exclude
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);

				if (excludedSlugs.length > 0) {
					filters.push(notInArray(tokens.slug, excludedSlugs));
				}
			}

			return filters.length > 0 ? and(...filters) : undefined;
		},
		limit,
		offset,
		orderBy: (tokens, { asc }) => [asc(tokens.rank)]
	});

	// 3. Return the success response
	return Response.json({
		success: true,
		message: 'Tokens fetched successfully',
		data: tokens
	} satisfies ApiResponse<Token[]>);
};
