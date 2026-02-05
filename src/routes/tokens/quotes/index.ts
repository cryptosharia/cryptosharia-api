import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Response schema for a token quote.
 */
export const TokenQuote = z
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
	.openapi('TokenQuote');

export const GetTokensQuotesParams = z
	.object({
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to get quotes for.<br>Example: bitcoin,ethereum,sui',
			required: true
		})
	})
	.openapi('GetTokensQuotesParams');

export const tokensQuotesGet: RouteConfig = {
	path: '/tokens/quotes',
	method: 'get',
	summary: 'Get Token Quotes',
	description: 'Fetch real-time quotes and market data for specific tokens from CoinMarketCap.',
	request: {
		query: GetTokensQuotesParams
	},
	responses: {
		...OpenApiResponse.ok(z.array(TokenQuote)),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.badGateway(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
