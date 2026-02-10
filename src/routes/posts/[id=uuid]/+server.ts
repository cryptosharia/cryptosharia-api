import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { PostsGetData } from '../[slug]';
import ApiResponse from '$lib/api-response';
import { getAssetUrl } from '$lib/assets';

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
			return ApiResponse.notFound();
		}

		return ApiResponse.ok<PostsGetData>(
			{
				...post,
				coverImage: post.coverImage
					? {
							id: post.coverImage.id,
							url: getAssetUrl(post.coverImage),
							filename: post.coverImage.filename,
							size: post.coverImage.size,
							mimeType: post.coverImage.mimeType,
							width: post.coverImage.width,
							height: post.coverImage.height
						}
					: null
			} as PostsGetData,
			'Post retrieved successfully'
		);
	} catch (err) {
		console.error('Error fetching post by ID:', err);
		return ApiResponse.internalServerError();
	}
};
