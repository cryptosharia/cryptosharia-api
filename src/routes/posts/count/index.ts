import { GetPostsParams } from '..';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';
import { ApiResponse } from '$lib/types';

export const GetPostsCountParams = GetPostsParams.pick({
	category: true,
	search: true
}).openapi('GetPostsCountParams', {
	description: 'Query parameters for counting posts with filtering and searching'
});

export const postsCount: RouteConfig = {
	path: '/posts/count',
	method: 'get',
	summary: 'Get the total number of posts matching the filters',
	request: {
		query: GetPostsCountParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.number().openapi({ example: 42 })
					})
				}
			}
		},
		400: {
			description: 'Bad Request',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};
