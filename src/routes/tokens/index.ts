import { shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import { OpenApiResponse, PaginatedData, UserMetadata, AssetMetadata } from '$lib/api';
import z from '$lib/zod-openapi';
import { Token } from '$lib/db/types';
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
