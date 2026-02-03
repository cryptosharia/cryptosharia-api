import { GetPostsParams } from '..';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const GetPostsCountParams = GetPostsParams.pick({
	category: true,
	search: true
}).openapi('GetPostsCountParams', {
	description: 'Query parameters for counting posts with filtering and searching'
});

export const postsCountGet: RouteConfig = {
	path: '/posts/count',
	method: 'get',
	summary: 'Count Posts',
	description: 'Get the total count of blog posts matching the specified criteria.',
	request: {
		query: GetPostsCountParams
	},
	responses: {
		...OpenApiResponse.ok(z.number().openapi({ example: 42 })),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.internalServerError()
	}
};
