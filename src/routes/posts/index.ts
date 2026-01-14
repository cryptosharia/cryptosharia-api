import { postCategory } from '$lib/server/db/schema';
import { ApiResponse, Post } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating post query parameters.
 * - category: strictly 'article' or 'activity'
 * - search: optional string
 * - limit: range 1-100, defaults to 10
 * - page: minimum 1, defaults to 1
 */
export const GetPostsParams = z
	.object({
		category: z.enum(postCategory.enumValues).optional(),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
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
