import { postSectionEnum, postTypeEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Post } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const GetPostsParams = z
	.object({
		sections: zQueryArray(z.enum(postSectionEnum.enumValues), {
			description: 'List of post sections to filter by.<br>Example: news,education,activity'
		}),
		types: zQueryArray(z.enum(postTypeEnum.enumValues), {
			description: 'List of post types to filter by.<br>Example: article,video,webinar'
		}),
		slugs: zQueryArray(z.string(), {
			description:
				'List of post slugs to filter by.<br>Example: this-is-a-post,this-is-another-post'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1),
		exclude: zQueryArray(z.string(), {
			description: 'List of post slugs to exclude.<br>Example: this-is-a-post,this-is-another-post'
		})
	})
	.openapi('GetPostsParams', {
		description: 'Query parameters for fetching posts with filtering, searching, and pagination'
	});

export const postsGet: RouteConfig = {
	path: '/posts',
	method: 'get',
	summary: 'List Posts',
	description:
		'Retrieve a list of blog posts with support for sections and types filtering, searching, and pagination.',
	request: {
		query: GetPostsParams
	},
	responses: {
		...OpenApiResponse.ok(z.array(Post).default([])),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
