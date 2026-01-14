import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { ApiResponse, Post } from '$lib/types';
import { GetPostsParams } from '.';
import z from '$lib/zod-openapi';

/**
 * Handles GET requests to fetch posts with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate query parameters using Zod
	const result = GetPostsParams.safeParse(Object.fromEntries(url.searchParams));

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

	const { category, search, limit, page, exclude } = result.data;
	const offset = (page - 1) * limit;

	// 2. Fetch posts from the database
	const posts = await db.query.posts.findMany({
		where: (posts, { eq, or, ilike, and, notInArray }) => {
			const filters = [];

			if (category !== 'all') {
				filters.push(eq(posts.category, category));
			}

			if (search) {
				const query = `%${search}%`;
				filters.push(
					or(ilike(posts.title, query), ilike(posts.description, query), ilike(posts.slug, query))
				);
			}

			if (exclude) {
				const excludedSlugs = exclude
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);

				if (excludedSlugs.length > 0) {
					filters.push(notInArray(posts.slug, excludedSlugs));
				}
			}

			return filters.length > 0 ? and(...filters) : undefined;
		},
		limit,
		offset,
		orderBy: (posts, { desc }) => [desc(posts.createdAt)]
	});

	// 3. Return the success response
	return Response.json({
		success: true,
		message: 'Posts fetched successfully',
		data: posts
	} satisfies ApiResponse<Post[]>);
};
