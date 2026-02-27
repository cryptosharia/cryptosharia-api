import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { ApiResponse, PaginatedData } from '$lib/api';
import { parseQueryParams } from '$lib/api/request';
import { PostsGetQuery, PostsGetItem } from '.';
import { toAssetMetadata } from '$lib/services/assets';
import {
	posts,
	postSectionEnum,
	postTypeEnum,
	contentStatusEnum,
	postTags,
	tags
} from '$lib/db/tables';
import { and, count, eq, ilike, inArray, notInArray, or } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import { hasPermission } from '$lib/auth/permissions';

/**
 * Handles GET requests to fetch posts with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const parsedQuery = parseQueryParams(url, PostsGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const {
		sections,
		types,
		slugs,
		tags: tagFilters,
		search,
		limit,
		page,
		exclude,
		statuses
	} = parsedQuery.data;
	const offset = (page - 1) * limit;

	if (statuses && statuses.some((s) => s !== 'published')) {
		if (!hasPermission(locals, 'posts.manage')) {
			return ApiResponse.forbidden(
				'You do not have permission to access content with the requested statuses.'
			);
		}
	}

	try {
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

			if (tagFilters && tagFilters.length > 0) {
				const matchingPostIds = db
					.select({ postId: postTags.postId })
					.from(postTags)
					.innerJoin(tags, eq(postTags.tagId, tags.id))
					.where(inArray(tags.slug, tagFilters as string[]));

				filters.push(inArray(table.id, matchingPostIds));
			}

			if (search) {
				const query = `%${escapeLikePattern(search)}%`;
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

			let allowedStatuses = statuses;

			if (!allowedStatuses && !hasPermission(locals, 'posts.manage')) {
				allowedStatuses = ['published'];
			}

			if (allowedStatuses && allowedStatuses.length > 0) {
				filters.push(
					inArray(table.status, allowedStatuses as (typeof contentStatusEnum.enumValues)[number][])
				);
			}

			return filters.length > 0 ? and(...filters) : undefined;
		};

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
					tags: {
						columns: {},
						with: {
							tag: {
								columns: {
									id: true,
									name: true,
									slug: true
								}
							}
						}
					},
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

		return ApiResponse.ok<PaginatedData<PostsGetItem>>(
			{
				items: postsList.map((p) =>
					PostsGetItem.parse({
						...p,
						tags: p.tags.map((postTag) => postTag.tag),
						coverImage: toAssetMetadata(p.coverImage)
					})
				),
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Posts retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch posts error:', error);
		return ApiResponse.internalServerError('Failed to retrieve posts');
	}
};
