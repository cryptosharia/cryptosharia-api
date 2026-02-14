import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { and, eq } from 'drizzle-orm';
import { PostsGetData } from '..';
import { ApiResponse } from '$lib/api';
import { toAssetMetadata } from '$lib/services/assets';

export const GET: RequestHandler = async ({ params }) => {
	const { slug } = params;

	try {
		const post = await db.query.posts.findFirst({
			where: and(eq(posts.slug, slug), eq(posts.status, 'published')),
			columns: {
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
			}
		});

		if (!post) {
			return ApiResponse.notFound('Post not found');
		}

		return ApiResponse.ok<PostsGetData>(
			PostsGetData.parse({
				...post,
				coverImage: toAssetMetadata(post.coverImage)
			}),
			'Post retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch post by slug error:', error);
		return ApiResponse.internalServerError('Failed to retrieve post');
	}
};
