import { postSectionEnum, postTypeEnum, contentStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import { OpenApiResponse, PaginatedData, UserMetadata, AssetMetadata } from '$lib/api';
import z from '$lib/zod-openapi';
import { Post } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const PostsGetQuery = z
	.object({
		statuses: zQueryArray(z.enum(contentStatusEnum.enumValues), {
			description: 'List of content statuses to filter by.<br>Example: published,draft'
		}),
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
		exclude: zQueryArray(z.string(), {
			description: 'List of post slugs to exclude.<br>Example: this-is-a-post,this-is-another-post'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('PostsGetQuery');

export const PostsGetItem = Post.omit({
	content: true,
	coverImageId: true
})
	.extend({
		coverImage: AssetMetadata,
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('PostsGetItem');
export type PostsGetItem = z.infer<typeof PostsGetItem>;

export const PostsGetData = Post.omit({
	coverImageId: true
})
	.extend({
		coverImage: AssetMetadata,
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('PostsGetData');
export type PostsGetData = z.infer<typeof PostsGetData>;

export const postsGet: RouteConfig = {
	path: '/posts',
	method: 'get',
	summary: 'List Posts',
	description:
		'Retrieve a list of posts with filtering, searching, and pagination support.<br>Note: Guests/members requesting non-published statuses will receive a 403 Forbidden.',
	request: {
		query: PostsGetQuery
	},
	responses: {
		...OpenApiResponse.ok(
			PaginatedData(PostsGetItem, 'PostsGetItem'),
			'Paginated list of posts retrieved successfully'
		),
		...OpenApiResponse.badRequest('Invalid query parameters provided'),
		...OpenApiResponse.forbidden('Explicitly requesting non-published statuses without permission'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve posts due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const PostsDetailGetParams = z
	.object({
		id: z.string().describe('The UUID or Slug of the post')
	})
	.openapi('PostsDetailGetParams');

export const postsDetailGet: RouteConfig = {
	path: '/posts/{id}',
	method: 'get',
	summary: 'Get Post by Identifier',
	description:
		'Retrieve a single post using its UUID or Slug. Support for draft preview is automatically handled based on user permissions.',
	request: {
		params: PostsDetailGetParams
	},
	responses: {
		...OpenApiResponse.ok(PostsGetData, 'Post retrieved successfully'),
		...OpenApiResponse.notFound('Post not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve post due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};
