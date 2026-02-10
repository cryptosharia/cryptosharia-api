import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { PostsGetData } from '../[slug]';
import ApiResponse from '$lib/api-response';

export const GET: RequestHandler = async ({ params }: { params: { id: string } }) => {
	const { id } = params;

	try {
		const post = await db.query.posts.findFirst({
			where: eq(posts.id, id),
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
			}
		});

		if (!post) {
			return ApiResponse.notFound();
		}

		return ApiResponse.ok<PostsGetData>(post as PostsGetData, 'Post retrieved successfully (Internal)');
	} catch (err) {
		console.error('Error fetching post by ID:', err);
		return ApiResponse.internalServerError();
	}
};
