import { shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Token } from '$lib/db/types';
import { PaginatedData, UserMetadata, AssetMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating token query parameters.
 */
export const TokensGetQuery = z
	.object({
		statuses: zQueryArray(z.enum(contentStatusEnum.enumValues), {
			description: 'List of content statuses to filter by.<br>Example: published,draft'
		}).default(['published']),
		shariaStatuses: zQueryArray(z.enum(shariaStatusEnum.enumValues), {
			description: 'List of sharia statuses to filter by.<br>Example: halal,haram'
		}),
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to filter by.<br>Example: bitcoin,ethereum,sui'
		}),
		exclude: zQueryArray(z.string(), {
			description: 'List of token slugs to exclude.<br>Example: bitcoin,ethereum,sui'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('TokensGetQuery', {
		description: 'Query parameters for fetching tokens with filtering, searching, and pagination'
	});

export const TokensGetItem = Token.omit({
	content: true,
	logoId: true
})
	.extend({
		logo: AssetMetadata,
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
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('TokensGetData');
export type TokensGetData = z.infer<typeof TokensGetData>;

export const tokensGet: RouteConfig = {
	path: '/tokens',
	method: 'get',
	summary: 'List Tokens',
	description:
		'Retrieve a list of cryptocurrency tokens with filtering, searching, and pagination support.',
	request: {
		query: TokensGetQuery
	},
	responses: {
		...OpenApiResponse.ok(
			PaginatedData(TokensGetItem, 'TokensGetItem'),
			'Paginated list of tokens retrieved successfully'
		),
		...OpenApiResponse.badRequest('Invalid query parameters provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve tokens due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TokensSlugGetParams = z
	.object({
		slug: z.string().describe('The slug of the cryptocurrency token')
	})
	.openapi('TokensSlugGetParams');

export const tokensSlugGet: RouteConfig = {
	path: '/tokens/{slug}',
	method: 'get',
	summary: 'Get Published Token by Slug',
	description: 'Retrieve a single published cryptocurrency token using its slug.',
	request: {
		params: TokensSlugGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData, 'Published token retrieved successfully'),
		...OpenApiResponse.notFound('Token not found or is not published'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve token due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const TokensIdGetParams = z
	.object({
		id: z.uuid().describe('The UUID of the cryptocurrency token')
	})
	.openapi('TokensIdGetParams');

export const tokensIdGet: RouteConfig = {
	path: '/tokens/{id}',
	method: 'get',
	summary: 'Get Token by ID',
	description: 'Retrieve any cryptocurrency token using its UUID regardless of its status.',
	request: {
		params: TokensIdGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData, 'Token retrieved successfully by ID'),
		...OpenApiResponse.notFound('Token not found'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve token due to an internal server error'
		)
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
