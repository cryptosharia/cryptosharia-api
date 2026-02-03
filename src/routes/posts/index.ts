import { postCategory } from '$lib/db/tables';
import { ApiResponse, Post } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const GetPostsParams = z
	.object({
		category: z.enum(['all', ...postCategory.enumValues]).default('all'),
		slug: z.string().optional(),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1),
		exclude: z.string().optional().openapi({
			description: 'Comma-separated list of post slugs to exclude',
			example: 'this-is-a-post,this-is-another-post'
		})
	})
	.openapi('GetPostsParams', {
		description: 'Query parameters for fetching posts with filtering, searching, and pagination'
	});

export const posts: RouteConfig = {
	path: '/posts',
	method: 'get',
	summary: 'Fetch posts with filtering, searching, and pagination',
	request: {
		query: GetPostsParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.array(Post).default([])
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
