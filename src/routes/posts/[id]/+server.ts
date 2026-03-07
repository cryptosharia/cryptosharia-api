import type { RequestHandler } from './$types';
import { PostsDetailGetParams, PostsGetData, PostsUpdateBody } from '..';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { db } from '$lib/db';
import { assets, postTags, posts } from '$lib/db/tables';
import { and, eq, ne } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import {
	fetchPostDetail,
	findPostByIdentifier,
	resolvePostTagIdentifiers
} from '$lib/services/posts';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const post = await fetchPostDetail(locals, params.id);

		if (!post) {
			return ApiResponse.notFound('Post not found');
		}

		return ApiResponse.ok<PostsGetData>(PostsGetData.parse(post), 'Post retrieved successfully');
	} catch (error) {
		console.error('GET /posts/[id] error:', error);
		return ApiResponse.internalServerError('Failed to retrieve post details');
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const authError = requirePermission(locals, 'posts.manage');
	if (authError) return authError;

	const parsedBody = await parseJsonBody(request, PostsUpdateBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	try {
		const { id } = PostsDetailGetParams.parse(params);
		const existingPost = await findPostByIdentifier(id);
		if (!existingPost) {
			return ApiResponse.notFound('Post not found');
		}

		const {
			title,
			slug,
			excerpt,
			content,
			coverImageId,
			section,
			type,
			status,
			isFeatured,
			eventDate,
			externalLink,
			tags
		} = parsedBody.data;

		if (slug && slug !== existingPost.slug) {
			const duplicateSlugPost = await db.query.posts.findFirst({
				where: and(eq(posts.slug, slug), ne(posts.id, existingPost.id))
			});

			if (duplicateSlugPost) {
				return ApiResponse.conflict('Post with this slug already exists');
			}
		}

		if (coverImageId) {
			const asset = await db.query.assets.findFirst({ where: eq(assets.id, coverImageId) });
			if (!asset) {
				return ApiResponse.badRequest({ coverImageId: ['Cover image not found'] });
			}
		}

		let resolvedTagIds: string[] | undefined;
		if (tags !== undefined) {
			const tagResolution = await resolvePostTagIdentifiers(tags);
			if (!tagResolution.ok) {
				return ApiResponse.badRequest({
					tags: [`Unknown tag identifier(s): ${tagResolution.missingIdentifiers.join(', ')}`]
				});
			}

			resolvedTagIds = tagResolution.tagIds;
		}

		const userId = locals.user?.id;
		const publishedAt =
			status === undefined
				? undefined
				: status === 'published'
					? (existingPost.publishedAt ?? new Date())
					: null;

		await db.transaction(async (tx) => {
			await tx
				.update(posts)
				.set({
					title,
					slug,
					excerpt,
					content,
					coverImageId,
					section,
					type,
					status,
					isFeatured,
					eventDate,
					externalLink,
					publishedAt,
					updatedBy: userId
				})
				.where(eq(posts.id, existingPost.id));

			if (resolvedTagIds !== undefined) {
				await tx.delete(postTags).where(eq(postTags.postId, existingPost.id));

				if (resolvedTagIds.length > 0) {
					await tx.insert(postTags).values(
						resolvedTagIds.map((tagId) => ({
							postId: existingPost.id,
							tagId
						}))
					);
				}
			}
		});

		const post = await fetchPostDetail(locals, existingPost.id);
		if (!post) {
			return ApiResponse.internalServerError('Failed to update post');
		}

		return ApiResponse.ok<PostsGetData>(PostsGetData.parse(post), 'Post updated successfully');
	} catch (error) {
		console.error('PATCH /posts/[id] error:', error);
		return ApiResponse.internalServerError('Failed to update post');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const authError = requirePermission(locals, 'posts.manage');
	if (authError) return authError;

	try {
		const { id } = PostsDetailGetParams.parse(params);
		const existingPost = await findPostByIdentifier(id);

		if (!existingPost) {
			return ApiResponse.notFound('Post not found');
		}

		await db.delete(posts).where(eq(posts.id, existingPost.id));

		return ApiResponse.ok({ message: 'Post deleted successfully' }, 'Post deleted successfully');
	} catch (error) {
		console.error('DELETE /posts/[id] error:', error);
		return ApiResponse.internalServerError('Failed to delete post');
	}
};
