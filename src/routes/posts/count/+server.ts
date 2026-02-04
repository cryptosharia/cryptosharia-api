import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import { count, eq, or, ilike, and } from 'drizzle-orm';
import { GetPostsCountParams } from '.';
import type { RequestHandler } from './$types';

/**
 * Handles GET /posts/count
 * Returns total count of posts matching filters
 */
export const GET: RequestHandler = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams);
	const result = GetPostsCountParams.safeParse(params);

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { category, search } = result.data;

	try {
		const filters = [];

		if (category !== 'all') {
			filters.push(eq(posts.section, category));
		}

		if (search) {
			const query = `%${search}%`;
			filters.push(
				or(ilike(posts.title, query), ilike(posts.content, query), ilike(posts.slug, query))
			);
		}

		const [row] = await db
			.select({ value: count() })
			.from(posts)
			.where(filters.length > 0 ? and(...filters) : undefined);

		return ApiResponse.ok<number>(row.value);
	} catch (err) {
		console.error('Error counting posts:', err);
		return ApiResponse.internalServerError();
	}
};
