import { PostsGetData } from '../[slug]';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const PostsIdGetParams = z
	.object({
		id: z.uuid().describe('The UUID of the post')
	})
	.openapi('PostsIdGetParams');

export const postsIdGet: RouteConfig = {
	path: '/posts/{id}',
	method: 'get',
	summary: 'Get Post by ID',
	description: 'Retrieve any post using its UUID regardless of its status.',
	request: {
		params: PostsIdGetParams
	},
	responses: {
		...OpenApiResponse.ok(PostsGetData),
		...OpenApiResponse.notFound(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
