import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { z } from 'zod';
import { postCategory } from '$lib/server/db/schema';
import type { Post } from '$lib/types';

/**
 * Zod schema for validating post query parameters.
 * - category: strictly 'article' or 'activity'
 * - search: optional string
 * - limit: range 1-100, defaults to 10
 * - page: minimum 1, defaults to 1
 */
const GetParams = z.object({
	category: z.enum(postCategory.enumValues).optional(),
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(10),
	page: z.coerce.number().min(1).default(1)
});

/**
 * Handles GET requests to fetch posts with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate query parameters using Zod
	const result = GetParams.safeParse(Object.fromEntries(url.searchParams));

	// If validation fails, return a 400 Bad Request using the class helper
	if (!result.success) {
		return Response.json(
			{
				success: false,
				message: 'Invalid query parameters',
				errors: result.error.flatten().fieldErrors,
				data: null
			} satisfies ApiResponse<null>,
			{ status: 400 }
		);
	}

	const { category, search, limit, page } = result.data;
	const offset = (page - 1) * limit;

	// 2. Fetch posts from the database
	const posts = await db.query.posts.findMany({
		where: (posts, { eq, or, ilike, and }) => {
			const filters = [];

			if (category) {
				filters.push(eq(posts.category, category));
			}

			if (search) {
				const query = `%${search}%`;
				filters.push(
					or(ilike(posts.title, query), ilike(posts.description, query), ilike(posts.slug, query))
				);
			}

			return filters.length > 0 ? and(...filters) : undefined;
		},
		limit,
		offset,
		orderBy: (posts, { desc }) => [desc(posts.createdAt)]
	});

	// 3. Return structured success response
	return Response.json({
		success: true,
		message: 'Posts fetched successfully',
		data: posts
	} satisfies ApiResponse<Post[]>);
};
