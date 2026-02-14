import type { RequestHandler } from './$types';
import { PostsGetData } from '..';
import { ApiResponse } from '$lib/api';
import { fetchPostDetail } from '$lib/services/posts';

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
