import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { and, eq } from 'drizzle-orm';
import { PostsGetData } from '.';
import ApiResponse from '$lib/api-response';
import { getAssetUrl } from '$lib/assets';

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
		console.error('Error fetching post by slug:', err);
		return ApiResponse.internalServerError();
	}
};
