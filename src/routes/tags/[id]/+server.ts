import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { isUuid } from '$lib/utils';
import { TagsGetData, TagsUpdateBody, TagsDetailGetParams } from '..';
import { tags, postTags, tokenTags } from '$lib/db/tables';
import { eq, or, and, ne } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { logActivity } from '$lib/services/activity-logger';

async function findTagByIdOrSlug(idOrSlug: string) {
	const where = isUuid(idOrSlug) ? eq(tags.id, idOrSlug) : eq(tags.slug, idOrSlug);

	return db.query.tags.findFirst({ where });
}

export const GET: RequestHandler = async ({ params }) => {
	const { id } = TagsDetailGetParams.parse(params);

	try {
		const tag = await findTagByIdOrSlug(id);

		if (!tag) {
			return ApiResponse.notFound('Tag not found');
		}

		return ApiResponse.ok<TagsGetData>(
			{ ...tag, createdBy: null, updatedBy: null } as TagsGetData,
			'Tag retrieved successfully'
		);
	} catch (error) {
		console.error('GET /tags/{id} error:', error);
		return ApiResponse.internalServerError('Failed to retrieve tag');
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const authError = requirePermission(locals, 'tags.manage');
	if (authError) return authError;

	try {
		const { id } = TagsDetailGetParams.parse(params);

		const parsedBody = await parseJsonBody(request, TagsUpdateBody);
		if (!parsedBody.ok) {
			return parsedBody.response;
		}

		const existingTag = await findTagByIdOrSlug(id);
		if (!existingTag) {
			return ApiResponse.notFound('Tag not found');
		}

		const updateData = parsedBody.data;
		const nextContentSection =
			updateData.contentSection === undefined ? existingTag.contentSection : updateData.contentSection;
		const nextShowInNavigation =
			updateData.showInNavigation === undefined
				? existingTag.showInNavigation
				: updateData.showInNavigation;
		if (nextShowInNavigation && !nextContentSection) {
			return ApiResponse.badRequest({ contentSection: ['Required for public navigation categories'] });
		}

		if (updateData.name || updateData.slug) {
			const conflictFilter = [];
			if (updateData.name && updateData.name !== existingTag.name) {
				conflictFilter.push(eq(tags.name, updateData.name));
			}
			if (updateData.slug && updateData.slug !== existingTag.slug) {
				conflictFilter.push(eq(tags.slug, updateData.slug));
			}

			if (conflictFilter.length > 0) {
				const duplicate = await db.query.tags.findFirst({
					where: and(or(...conflictFilter), ne(tags.id, existingTag.id))
				});

				if (duplicate) {
					return ApiResponse.conflict('Tag with this name or slug already exists');
				}
			}
		}

		const userId = locals.user?.id;

		const [updatedTag] = await db
			.update(tags)
			.set({
				name: updateData.name,
				slug: updateData.slug,
				description: updateData.description,
				contentSection: updateData.contentSection,
				showInNavigation: updateData.showInNavigation,
				displayOrder: updateData.displayOrder,
				updatedBy: userId
			})
			.where(eq(tags.id, existingTag.id))
			.returning();

		if (userId) {
			await logActivity({
				userId,
				action: 'tag.update',
				subjectType: 'tags',
				subjectId: existingTag.id,
				description: `Updated tag ${existingTag.slug}`,
				ipAddress: locals.clientIp
			});
		}

		return ApiResponse.ok<TagsGetData>(
			{ ...updatedTag, createdBy: null, updatedBy: null } as TagsGetData,
			'Tag updated successfully'
		);
	} catch (error) {
		console.error('PATCH /tags/{id} error:', error);
		return ApiResponse.internalServerError('Failed to update tag');
	}
};

export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	const authError = requirePermission(locals, 'tags.manage');
	if (authError) return authError;

	try {
		const idPart = params.id;
		const force = url.searchParams.get('force') === 'true';

		const tag = await findTagByIdOrSlug(idPart);

		if (!tag) {
			return ApiResponse.notFound('Tag not found');
		}

		const [postCountResult] = await db
			.select({ value: count() })
			.from(postTags)
			.where(eq(postTags.tagId, tag.id));

		const [tokenCountResult] = await db
			.select({ value: count() })
			.from(tokenTags)
			.where(eq(tokenTags.tagId, tag.id));

		const postCount = postCountResult?.value || 0;
		const tokenCount = tokenCountResult?.value || 0;

		if (!force && (postCount > 0 || tokenCount > 0)) {
			return ApiResponse.conflict(
				`Tag is in use by ${postCount} post(s) and ${tokenCount} token(s). Use force=true to delete anyway.`
			);
		}

		await db.delete(tags).where(eq(tags.id, tag.id));

		if (locals.user?.id) {
			await logActivity({
				userId: locals.user.id,
				action: 'tag.delete',
				subjectType: 'tags',
				subjectId: tag.id,
				description: `Deleted tag ${tag.slug}`,
				ipAddress: locals.clientIp
			});
		}

		return ApiResponse.ok({ message: 'Tag deleted successfully' }, 'Tag deleted successfully');
	} catch (error) {
		console.error('DELETE /tags/{id} error:', error);
		return ApiResponse.internalServerError('Failed to delete tag');
	}
};
