import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import ApiResponse from '$lib/api-response';
import { GetPostsParams } from '.';
import z from '$lib/zod-openapi';

/**
 * Handles GET requests to fetch posts with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate query parameters using Zod
	const params = Object.fromEntries(url.searchParams);
	const result = GetPostsParams.safeParse(params);

	// If validation fails, return a 400 Bad Request
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { category, slugs, search, limit, page, exclude } = result.data;
	const offset = (page - 1) * limit;

	try {
		// 2. Fetch posts from the database
		const postsList = await db.query.posts.findMany({
			where: (posts, { eq, or, ilike, and, notInArray, inArray }) => {
				const filters = [];

				if (category !== 'all') {
					filters.push(eq(posts.section, category));
				}

				if (slugs && (slugs as string[]).length > 0) {
					filters.push(inArray(posts.slug, slugs as string[]));
				}

				if (search) {
					const query = `%${search}%`;
					filters.push(
						or(ilike(posts.title, query), ilike(posts.content, query), ilike(posts.slug, query))
					);
				}

				if (exclude && (exclude as string[]).length > 0) {
					filters.push(notInArray(posts.slug, exclude as string[]));
				}

				return filters.length > 0 ? and(...filters) : undefined;
			},
			limit,
			offset,
			orderBy: (posts, { desc }) => [desc(posts.createdAt)]
		});

		// 3. Return the success response
		return ApiResponse.ok(postsList);
	} catch (err) {
		console.error('Error fetching posts:', err);
		return ApiResponse.internalServerError();
	}
};
