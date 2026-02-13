import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { PostsGetData } from '..';
import ApiResponse from '$lib/api-response';
import { toAssetMetadata } from '$lib/assets';

export const GET: RequestHandler = async ({ params }: { params: { id: string } }) => {
	const { id } = params;

	try {
		const post = await db.query.posts.findFirst({
			where: eq(posts.id, id),
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
		console.error('Fetch post by UUID error:', error);
		return ApiResponse.internalServerError('Failed to retrieve post');
	}
};
