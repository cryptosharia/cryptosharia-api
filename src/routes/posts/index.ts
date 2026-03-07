import { postSectionEnum, postTypeEnum, contentStatusEnum } from '$lib/db/schema/content';
import { zQueryArray } from '$lib/utils';
import { OpenApiResponse, PaginatedData, UserMetadata, AssetMetadata } from '$lib/api';
import z from '$lib/zod-openapi';
import { Post, Tag } from '$lib/db/types';
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
		tags: zQueryArray(z.string(), {
			description: 'List of tag slugs to filter by.<br>Example: education,halal'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('PostsGetQuery');

export const PostsTagItem = Tag.pick({
	id: true,
	name: true,
	slug: true
}).openapi('PostsTagItem');

export const PostsTagDetail = Tag.pick({
	id: true,
	name: true,
	slug: true,
	description: true
}).openapi('PostsTagDetail');

export const PostsGetItem = Post.omit({
	content: true,
	coverImageId: true
})
	.extend({
		coverImage: AssetMetadata,
		tags: z.array(PostsTagItem),
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
		tags: z.array(PostsTagDetail),
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('PostsGetData');
export type PostsGetData = z.infer<typeof PostsGetData>;

export const PostsWriteTags = z
	.array(z.string().trim().min(1))
	.max(50, 'Tags must contain at most 50 identifiers')
	.optional()
	.describe('List of tag identifiers (UUID or slug) to attach to this post');

export const PostsCreateBody = z
	.object({
		title: z.string().trim().min(1).max(255),
		slug: z.string().trim().min(1).max(255),
		excerpt: z.string().trim().min(1),
		content: z.string().trim().min(1),
		coverImageId: z.uuid(),
		section: z.enum(postSectionEnum.enumValues),
		type: z.enum(postTypeEnum.enumValues),
		status: z.enum(contentStatusEnum.enumValues).optional().default('draft'),
		isFeatured: z.boolean().optional().default(false),
		eventDate: z.coerce.date().optional().nullable(),
		externalLink: z.url().optional().nullable(),
		tags: PostsWriteTags
	})
	.openapi('PostsCreateBody');
export type PostsCreateBody = z.infer<typeof PostsCreateBody>;

export const PostsUpdateBody = z
	.object({
		title: z.string().trim().min(1).max(255).optional(),
		slug: z.string().trim().min(1).max(255).optional(),
		excerpt: z.string().trim().min(1).optional(),
		content: z.string().trim().min(1).optional(),
		coverImageId: z.uuid().optional(),
		section: z.enum(postSectionEnum.enumValues).optional(),
		type: z.enum(postTypeEnum.enumValues).optional(),
		status: z.enum(contentStatusEnum.enumValues).optional(),
		isFeatured: z.boolean().optional(),
		eventDate: z.coerce.date().optional().nullable(),
		externalLink: z.url().optional().nullable(),
		tags: PostsWriteTags
	})
	.refine(
		(body) =>
			body.title !== undefined ||
			body.slug !== undefined ||
			body.excerpt !== undefined ||
			body.content !== undefined ||
			body.coverImageId !== undefined ||
			body.section !== undefined ||
			body.type !== undefined ||
			body.status !== undefined ||
			body.isFeatured !== undefined ||
			body.eventDate !== undefined ||
			body.externalLink !== undefined ||
			body.tags !== undefined,
		{ message: 'At least one field must be provided for update' }
	)
	.openapi('PostsUpdateBody');
export type PostsUpdateBody = z.infer<typeof PostsUpdateBody>;

export const PostsDeleteData = z
	.object({
		message: z.string()
	})
	.openapi('PostsDeleteData');

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

export const postsCreate: RouteConfig = {
	path: '/posts',
	method: 'post',
	summary: 'Create Post',
	description:
		'Create a post and optionally set tag relations. Values in `tags` can be tag UUIDs or slugs.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: PostsCreateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(PostsGetData, 'Post created successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: posts.manage'),
		...OpenApiResponse.conflict('Post with this slug already exists'),
		...OpenApiResponse.internalServerError('Failed to create post due to an internal server error')
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

export const postsDetailUpdate: RouteConfig = {
	path: '/posts/{id}',
	method: 'patch',
	summary: 'Update Post',
	description:
		'Update an existing post by UUID or Slug. When `tags` is provided, the existing post tags are replaced.',
	request: {
		params: PostsDetailGetParams,
		body: {
			content: {
				'application/json': {
					schema: PostsUpdateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(PostsGetData, 'Post updated successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.notFound('Post not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: posts.manage'),
		...OpenApiResponse.conflict('Post with this slug already exists'),
		...OpenApiResponse.internalServerError('Failed to update post due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const postsDetailDelete: RouteConfig = {
	path: '/posts/{id}',
	method: 'delete',
	summary: 'Delete Post',
	description: 'Delete a post by UUID or Slug.',
	request: {
		params: PostsDetailGetParams
	},
	responses: {
		...OpenApiResponse.ok(PostsDeleteData, 'Post deleted successfully'),
		...OpenApiResponse.notFound('Post not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: posts.manage'),
		...OpenApiResponse.internalServerError('Failed to delete post due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const postsRoutes: RouteConfig[] = [
	postsGet,
	postsCreate,
	postsDetailGet,
	postsDetailUpdate,
	postsDetailDelete
];
