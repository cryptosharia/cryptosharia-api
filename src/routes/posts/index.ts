import { postSectionEnum, postTypeEnum, contentStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Post } from '$lib/db/types';
import { PaginatedData, UserMetadata, AssetMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const PostsGetQuery = z
	.object({
		statuses: zQueryArray(z.enum(contentStatusEnum.enumValues), {
			description: 'List of content statuses to filter by.<br>Example: published,draft'
		}).default(['published']),
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
		updatedBy: UserMetadata.nullable(),
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
	description: 'Retrieve a list of posts with filtering, searching, and pagination support.',
	request: {
		query: PostsGetQuery
	},
	responses: {
		...OpenApiResponse.ok(PaginatedData(PostsGetItem, 'PostsGetItem')),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};

export const PostsSlugGetParams = z
	.object({
		slug: z.string().describe('The slug of the post')
	})
	.openapi('PostsSlugGetParams');

export const postsSlugGet: RouteConfig = {
	path: '/posts/{slug}',
	method: 'get',
	summary: 'Get Published Post by Slug',
	description: 'Retrieve a single published post using its slug.',
	request: {
		params: PostsSlugGetParams
	},
	responses: {
		...OpenApiResponse.ok(PostsGetData),
		...OpenApiResponse.notFound(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};

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
