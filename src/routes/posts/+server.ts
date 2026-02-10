import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { PaginatedData } from '$lib/types';
import ApiResponse from '$lib/api-response';
import { PostsGetQuery, PostsGetItem } from '.';
import z from '$lib/zod-openapi';
import { getAssetUrl } from '$lib/assets';
import { posts, postSectionEnum, postTypeEnum, contentStatusEnum } from '$lib/db/tables';
import { and, count, ilike, inArray, notInArray, or } from 'drizzle-orm';

/**
 * Handles GET requests to fetch posts with filtering, searching, and pagination.
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
	const result = PostsGetQuery.safeParse(params);

	// If validation fails, return a 400 Bad Request
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { sections, types, slugs, search, limit, page, exclude, statuses } = result.data;
	const offset = (page - 1) * limit;

	try {
		// 2. Define filters for both list and count queries
		const getFilters = (table: typeof posts) => {
			const filters = [];

			if (sections && sections.length > 0) {
				filters.push(
					inArray(table.section, (sections as (typeof postSectionEnum.enumValues)[number][]) || [])
				);
			}

			if (types && types.length > 0) {
				filters.push(
					inArray(table.type, (types as (typeof postTypeEnum.enumValues)[number][]) || [])
				);
			}

			if (slugs && (slugs as string[]).length > 0) {
				filters.push(inArray(table.slug, slugs as string[]));
			}

			if (search) {
				const query = `%${search}%`;
				filters.push(
					or(
						ilike(table.title, query),
						ilike(table.excerpt, query),
						ilike(table.slug, query),
						ilike(table.content, query)
					)
				);
			}

			if (exclude && (exclude as string[]).length > 0) {
				filters.push(notInArray(table.slug, exclude as string[]));
			}

			// 🔓 Filter by status (default handled by Zod)
			filters.push(
				inArray(table.status, statuses as (typeof contentStatusEnum.enumValues)[number][])
			);

			return filters.length > 0 ? and(...filters) : undefined;
		};

		// 3. Fetch data and count in parallel
		const [postsList, [countResult]] = await Promise.all([
			db.query.posts.findMany({
				where: getFilters(posts),
				limit,
				offset,
				columns: {
					content: false,
					coverImageId: false
				},
				with: {
					coverImage: true,
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
				orderBy: (table, { desc }) => [desc(table.createdAt)]
			}),
			db.select({ value: count() }).from(posts).where(getFilters(posts))
		]);

		const total = countResult.value;

		// 4. Return the paginated success response
		return ApiResponse.ok<PaginatedData<PostsGetItem>>(
			{
				items: postsList.map(({ ...p }) => ({
					...p,
					coverImage: p.coverImage
						? {
								id: p.coverImage.id,
								url: getAssetUrl(p.coverImage),
								filename: p.coverImage.filename,
								size: p.coverImage.size,
								mimeType: p.coverImage.mimeType,
								width: p.coverImage.width,
								height: p.coverImage.height
							}
						: null
				})) as PostsGetItem[],
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Posts retrieved successfully'
		);
	} catch (err) {
		console.error('Error fetching posts:', err);
		return ApiResponse.internalServerError();
	}
};
