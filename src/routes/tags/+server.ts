import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { ApiResponse, PaginatedData } from '$lib/api';
import { parseJsonBody, parseQueryParams } from '$lib/api/request';
import { TagsGetQuery, TagsGetItem, TagsCreateBody, TagsGetData } from '.';
import { tags } from '$lib/db/tables';
import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { logActivity } from '$lib/services/activity-logger';

export const GET: RequestHandler = async ({ url }) => {
	const parsedQuery = parseQueryParams(url, TagsGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const { search, slugs, contentSections, showInNavigation, limit, page } = parsedQuery.data;
	const offset = (page - 1) * limit;

	try {
		const filters = [];

		if (slugs && slugs.length > 0) {
			filters.push(inArray(tags.slug, slugs as string[]));
		}

		if (contentSections && contentSections.length > 0) {
			filters.push(inArray(tags.contentSection, contentSections as ('news' | 'education')[]));
		}

		if (showInNavigation !== undefined) {
			filters.push(eq(tags.showInNavigation, showInNavigation));
		}

		if (search) {
			const query = `%${search}%`;
			filters.push(
				or(ilike(tags.name, query), ilike(tags.slug, query), ilike(tags.description, query))
			);
		}

		const where = filters.length > 0 ? and(...filters) : undefined;

		const [tagsList, [countResult]] = await Promise.all([
			db.query.tags.findMany({
				where,
				limit,
				offset,
				with: {
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
			orderBy: (table, { asc }) =>
				contentSections || showInNavigation !== undefined
					? [asc(table.displayOrder), asc(table.name)]
					: [asc(table.name)]
			}),
			db.select({ value: count() }).from(tags).where(where)
		]);

		const total = countResult.value;

		return ApiResponse.ok<PaginatedData<TagsGetItem>>(
			{
				items: tagsList as TagsGetItem[],
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Tags retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch tags error:', error);
		return ApiResponse.internalServerError('Failed to retrieve tags');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requirePermission(locals, 'tags.manage');
	if (authError) return authError;

	try {
		const parsedBody = await parseJsonBody(request, TagsCreateBody);
		if (!parsedBody.ok) {
			return parsedBody.response;
		}

		const { name, slug, description, contentSection, showInNavigation, displayOrder } = parsedBody.data;
		if (showInNavigation && !contentSection) {
			return ApiResponse.badRequest({ contentSection: ['Required for public navigation categories'] });
		}

		const existingTag = await db.query.tags.findFirst({
			where: or(eq(tags.name, name), eq(tags.slug, slug))
		});

		if (existingTag) {
			return ApiResponse.conflict('Tag with this name or slug already exists');
		}

		const userId = locals.user?.id;

		const [createdTag] = await db
			.insert(tags)
			.values({
				name,
				slug,
				description,
				contentSection,
				showInNavigation,
				displayOrder,
				createdBy: userId,
				updatedBy: userId
			})
			.returning();

		if (userId) {
			await logActivity({
				userId,
				action: 'tag.create',
				subjectType: 'tags',
				subjectId: createdTag.id,
				description: `Created tag ${createdTag.slug}`,
				ipAddress: locals.clientIp
			});
		}

		return ApiResponse.created<TagsGetData>(
			{ ...createdTag, createdBy: null, updatedBy: null } as TagsGetData,
			'Tag created successfully'
		);
	} catch (error) {
		console.error('Create tag error:', error);
		return ApiResponse.internalServerError('Failed to create tag');
	}
};
