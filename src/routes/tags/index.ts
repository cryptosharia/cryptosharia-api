import { zQueryArray } from '$lib/utils';
import { OpenApiResponse, PaginatedData, UserMetadata } from '$lib/api';
import z from '$lib/zod-openapi';
import { Tag } from '$lib/db/types';
import { tagContentSectionEnum } from '$lib/db/tables';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const TagsGetQuery = z
	.object({
		search: z.string().optional(),
		slugs: zQueryArray(z.string(), {
			description: 'List of tag slugs to filter by.<br>Example: halal,defi'
		}),
		contentSections: zQueryArray(z.enum(tagContentSectionEnum.enumValues), {
			description: 'Public content sections to filter by. Example: news,education'
		}),
		showInNavigation: z.coerce.boolean().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('TagsGetQuery');

export const TagsGetItem = Tag.pick({
	id: true,
	name: true,
	slug: true,
	description: true,
	contentSection: true,
	showInNavigation: true,
	displayOrder: true,
	createdAt: true,
	updatedAt: true
})
	.extend({
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('TagsGetItem');
export type TagsGetItem = z.infer<typeof TagsGetItem>;

export const TagsGetData = TagsGetItem;
export type TagsGetData = z.infer<typeof TagsGetData>;

export const tagsGet: RouteConfig = {
	path: '/tags',
	method: 'get',
	summary: 'List Tags',
	description: 'Retrieve a list of tags with filtering, searching, and pagination support.',
	request: {
		query: TagsGetQuery
	},
	responses: {
		...OpenApiResponse.ok(
			PaginatedData(TagsGetItem, 'TagsGetItem'),
			'Paginated list of tags retrieved successfully'
		),
		...OpenApiResponse.badRequest('Invalid query parameters provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve tags due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TagsCreateBody = z
	.object({
		name: z.string().trim().min(1).max(50, 'Name must be at most 50 characters'),
		slug: z.string().trim().min(1).max(50, 'Slug must be at most 50 characters'),
		description: z.string().optional(),
		contentSection: z.enum(tagContentSectionEnum.enumValues).nullable().optional(),
		showInNavigation: z.boolean().optional().default(false),
		displayOrder: z.coerce.number().int().min(0).optional().nullable()
	})
	.openapi('TagsCreateBody');
export type TagsCreateBody = z.infer<typeof TagsCreateBody>;

export const tagsCreate: RouteConfig = {
	path: '/tags',
	method: 'post',
	summary: 'Create Tag',
	description: 'Create a new tag with name, slug, and optional description.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: TagsCreateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(TagsGetData, 'Tag created successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tags.manage'),
		...OpenApiResponse.conflict('Tag with this name or slug already exists'),
		...OpenApiResponse.internalServerError('Failed to create tag due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TagsDetailGetParams = z
	.object({
		id: z.string().describe('The UUID or Slug of the tag')
	})
	.openapi('TagsDetailGetParams');

export const tagsDetailGet: RouteConfig = {
	path: '/tags/{id}',
	method: 'get',
	summary: 'Get Tag by Identifier',
	description: 'Retrieve a single tag using its UUID or Slug.',
	request: {
		params: TagsDetailGetParams
	},
	responses: {
		...OpenApiResponse.ok(TagsGetData, 'Tag retrieved successfully'),
		...OpenApiResponse.notFound('Tag not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError('Failed to retrieve tag due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TagsUpdateBody = z
	.object({
		name: z.string().trim().min(1).max(50, 'Name must be at most 50 characters').optional(),
		slug: z.string().trim().min(1).max(50, 'Slug must be at most 50 characters').optional(),
		description: z.string().optional(),
		contentSection: z.enum(tagContentSectionEnum.enumValues).nullable().optional(),
		showInNavigation: z.boolean().optional(),
		displayOrder: z.coerce.number().int().min(0).optional().nullable()
	})
	.openapi('TagsUpdateBody');
export type TagsUpdateBody = z.infer<typeof TagsUpdateBody>;

export const tagsDetailUpdate: RouteConfig = {
	path: '/tags/{id}',
	method: 'patch',
	summary: 'Update Tag',
	description: 'Update an existing tag by UUID or Slug.',
	request: {
		params: TagsDetailGetParams,
		body: {
			content: {
				'application/json': {
					schema: TagsUpdateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(TagsGetData, 'Tag updated successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.notFound('Tag not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tags.manage'),
		...OpenApiResponse.conflict('Tag with this name or slug already exists'),
		...OpenApiResponse.internalServerError('Failed to update tag due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TagsDeleteParams = z
	.object({
		id: z.string().describe('The UUID or Slug of the tag')
	})
	.openapi('TagsDeleteParams');

export const TagsDeleteQuery = z
	.object({
		force: z.coerce.boolean().default(false).describe('Force delete even if tag is in use')
	})
	.openapi('TagsDeleteQuery');

export const TagsDeleteResponse = z
	.object({
		message: z.string()
	})
	.openapi('TagsDeleteResponse');

export const TagsDeleteConflictResponse = z
	.object({
		message: z.string(),
		usage: z.object({
			posts: z.number(),
			tokens: z.number()
		})
	})
	.openapi('TagsDeleteConflictResponse');

export const tagsDetailDelete: RouteConfig = {
	path: '/tags/{id}',
	method: 'delete',
	summary: 'Delete Tag',
	description:
		'Delete a tag by UUID or Slug. By default, returns 409 if the tag is still in use by posts or tokens. Use force=true to delete anyway.',
	request: {
		params: TagsDeleteParams,
		query: TagsDeleteQuery
	},
	responses: {
		...OpenApiResponse.ok(TagsDeleteResponse, 'Tag deleted successfully'),
		...OpenApiResponse.notFound('Tag not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tags.manage'),
		...OpenApiResponse.conflict('Tag is in use'),
		...OpenApiResponse.internalServerError('Failed to delete tag due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const tagsRoutes: RouteConfig[] = [
	tagsGet,
	tagsCreate,
	tagsDetailGet,
	tagsDetailUpdate,
	tagsDetailDelete
];
