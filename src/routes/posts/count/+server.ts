import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import { count, or, ilike, and, inArray } from 'drizzle-orm';
import { postSectionEnum, postTypeEnum } from '$lib/db/tables';
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

	const { sections, types, search } = result.data;

	try {
		const filters = [];

		if (sections && (sections as string[]).length > 0) {
			filters.push(
				inArray(posts.section, (sections as (typeof postSectionEnum.enumValues)[number][]) || [])
			);
		}

		if (types && (types as string[]).length > 0) {
			filters.push(
				inArray(posts.type, (types as (typeof postTypeEnum.enumValues)[number][]) || [])
			);
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
