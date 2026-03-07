import { shariaStatusEnum, contentStatusEnum } from '$lib/db/schema/content';
import { zQueryArray } from '$lib/utils';
import { OpenApiResponse, PaginatedData, UserMetadata, AssetMetadata } from '$lib/api';
import z from '$lib/zod-openapi';
import { Token, Tag } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/**
 * Zod schema for validating token query parameters.
 */
export const TokensGetQuery = z
	.object({
		statuses: zQueryArray(z.enum(contentStatusEnum.enumValues), {
			description: 'List of content statuses to filter by.<br>Example: published,draft'
		}),
		shariaStatuses: zQueryArray(z.enum(shariaStatusEnum.enumValues), {
			description: 'List of sharia statuses to filter by.<br>Example: halal,haram'
		}),
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to filter by.<br>Example: bitcoin,ethereum,sui'
		}),
		exclude: zQueryArray(z.string(), {
			description: 'List of token slugs to exclude.<br>Example: bitcoin,ethereum,sui'
		}),
		tags: zQueryArray(z.string(), {
			description: 'List of tag slugs to filter by.<br>Example: defi,platform'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('TokensGetQuery', {
		description: 'Query parameters for fetching tokens with filtering, searching, and pagination'
	});

export const TokensTagItem = Tag.pick({
	id: true,
	name: true,
	slug: true
}).openapi('TokensTagItem');

export const TokensTagDetail = Tag.pick({
	id: true,
	name: true,
	slug: true,
	description: true
}).openapi('TokensTagDetail');

export const TokensGetItem = Token.omit({
	content: true,
	logoId: true
})
	.extend({
		logo: AssetMetadata,
		tags: z.array(TokensTagItem),
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('TokensGetItem');
export type TokensGetItem = z.infer<typeof TokensGetItem>;

export const TokensGetData = Token.omit({
	logoId: true
})
	.extend({
		logo: AssetMetadata,
		tags: z.array(TokensTagDetail),
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('TokensGetData');
export type TokensGetData = z.infer<typeof TokensGetData>;

export const TokensWriteTags = z
	.array(z.string().trim().min(1))
	.max(50, 'Tags must contain at most 50 identifiers')
	.optional()
	.describe('List of tag identifiers (UUID or slug) to attach to this token');

export const TokensCreateBody = z
	.object({
		name: z.string().trim().min(1).max(100),
		ticker: z.string().trim().min(1).max(20),
		slug: z.string().trim().min(1).max(100),
		rank: z.number().int().min(1),
		shariaStatus: z.enum(shariaStatusEnum.enumValues),
		status: z.enum(contentStatusEnum.enumValues).optional().default('draft'),
		excerpt: z.string().trim().min(1),
		content: z.string().trim().min(1),
		website: z.url(),
		tradingviewSymbol: z.string().trim().max(64).optional().nullable(),
		logoId: z.uuid(),
		tags: TokensWriteTags
	})
	.openapi('TokensCreateBody');
export type TokensCreateBody = z.infer<typeof TokensCreateBody>;

export const TokensUpdateBody = z
	.object({
		name: z.string().trim().min(1).max(100).optional(),
		ticker: z.string().trim().min(1).max(20).optional(),
		slug: z.string().trim().min(1).max(100).optional(),
		rank: z.number().int().min(1).optional(),
		shariaStatus: z.enum(shariaStatusEnum.enumValues).optional(),
		status: z.enum(contentStatusEnum.enumValues).optional(),
		excerpt: z.string().trim().min(1).optional(),
		content: z.string().trim().min(1).optional(),
		website: z.url().optional(),
		tradingviewSymbol: z.string().trim().max(64).optional().nullable(),
		logoId: z.uuid().optional(),
		tags: TokensWriteTags
	})
	.refine(
		(body) =>
			body.name !== undefined ||
			body.ticker !== undefined ||
			body.slug !== undefined ||
			body.rank !== undefined ||
			body.shariaStatus !== undefined ||
			body.status !== undefined ||
			body.excerpt !== undefined ||
			body.content !== undefined ||
			body.website !== undefined ||
			body.tradingviewSymbol !== undefined ||
			body.logoId !== undefined ||
			body.tags !== undefined,
		{ message: 'At least one field must be provided for update' }
	)
	.openapi('TokensUpdateBody');
export type TokensUpdateBody = z.infer<typeof TokensUpdateBody>;

export const TokensDeleteData = z
	.object({
		message: z.string()
	})
	.openapi('TokensDeleteData');

export const tokensGet: RouteConfig = {
	path: '/tokens',
	method: 'get',
	summary: 'List Tokens',
	description:
		'Retrieve a list of cryptocurrency tokens with filtering, searching, and pagination support.<br>Note: Guests/members requesting non-published statuses will receive a 403 Forbidden.',
	request: {
		query: TokensGetQuery
	},
	responses: {
		...OpenApiResponse.ok(
			PaginatedData(TokensGetItem, 'TokensGetItem'),
			'Paginated list of tokens retrieved successfully'
		),
		...OpenApiResponse.badRequest('Invalid query parameters provided'),
		...OpenApiResponse.forbidden('Explicitly requesting non-published statuses without permission'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve tokens due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const tokensCreate: RouteConfig = {
	path: '/tokens',
	method: 'post',
	summary: 'Create Token',
	description:
		'Create a token and optionally set tag relations. Values in `tags` can be tag UUIDs or slugs.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: TokensCreateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(TokensGetData, 'Token created successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tokens.manage'),
		...OpenApiResponse.conflict('Token with this slug or ticker already exists'),
		...OpenApiResponse.internalServerError('Failed to create token due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TokensDetailGetParams = z
	.object({
		id: z.string().describe('The UUID or Slug of the cryptocurrency token')
	})
	.openapi('TokensDetailGetParams');

export const tokensDetailGet: RouteConfig = {
	path: '/tokens/{id}',
	method: 'get',
	summary: 'Get Token by Identifier',
	description:
		'Retrieve a single cryptocurrency token using its UUID or Slug. Support for draft preview is automatically handled based on user permissions.',
	request: {
		params: TokensDetailGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData, 'Token retrieved successfully'),
		...OpenApiResponse.notFound('Token not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve token due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const tokensDetailUpdate: RouteConfig = {
	path: '/tokens/{id}',
	method: 'patch',
	summary: 'Update Token',
	description:
		'Update an existing token by UUID or Slug. When `tags` is provided, existing token tags are replaced.',
	request: {
		params: TokensDetailGetParams,
		body: {
			content: {
				'application/json': {
					schema: TokensUpdateBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData, 'Token updated successfully'),
		...OpenApiResponse.badRequest('Invalid request body provided'),
		...OpenApiResponse.notFound('Token not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tokens.manage'),
		...OpenApiResponse.conflict('Token with this slug or ticker already exists'),
		...OpenApiResponse.internalServerError('Failed to update token due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const tokensDetailDelete: RouteConfig = {
	path: '/tokens/{id}',
	method: 'delete',
	summary: 'Delete Token',
	description: 'Delete a token by UUID or Slug.',
	request: {
		params: TokensDetailGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensDeleteData, 'Token deleted successfully'),
		...OpenApiResponse.notFound('Token not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Missing required permission: tokens.manage'),
		...OpenApiResponse.internalServerError('Failed to delete token due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};

// --- Token: Quotes ---

export const TokensQuotesGetItem = z
	.object({
		slug: z.string(),
		rank: z.number(),
		infiniteSupply: z.boolean(),
		maxSupply: z.number().nullable(),
		circulatingSupply: z.number(),
		priceUsd: z.number(),
		marketCapUsd: z.number(),
		marketCapDominance: z.number(),
		percentChange24h: z.number()
	})
	.openapi('TokensQuotesGetItem');

export type TokensQuotesGetItem = z.infer<typeof TokensQuotesGetItem>;

export const TokensQuotesGetQuery = z
	.object({
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to get quotes for.<br>Example: bitcoin,ethereum,sui',
			required: true
		})
	})
	.openapi('TokensQuotesGetQuery');

export type TokensQuotesGetQuery = z.infer<typeof TokensQuotesGetQuery>;

export const tokensQuotesGet: RouteConfig = {
	path: '/tokens/quotes',
	method: 'get',
	summary: 'Get Token Quotes',
	description: 'Fetch real-time quotes and market data for specific tokens from CoinMarketCap.',
	request: {
		query: TokensQuotesGetQuery
	},
	responses: {
		...OpenApiResponse.ok(z.array(TokensQuotesGetItem), 'Token quotes retrieved successfully'),
		...OpenApiResponse.badRequest('Invalid slug(s) provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.badGateway('Failed to fetch data from market data provider'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve token quotes due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const tokensRoutes: RouteConfig[] = [
	tokensGet,
	tokensCreate,
	tokensDetailGet,
	tokensDetailUpdate,
	tokensDetailDelete,
	tokensQuotesGet
];
