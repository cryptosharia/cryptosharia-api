import { ApiResponse } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const GetTokensQuotesParams = z
	.object({
		slugs: z.string().min(1).openapi({
			description: 'Comma-separated list of token slugs',
			example: 'bitcoin,ethereum,sui'
		})
	})
	.openapi('GetTokensQuotesParams');

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

export const tokensQuotes: RouteConfig = {
	path: '/tokens/quotes',
	method: 'get',
	summary: 'Fetch live token quotes from CoinMarketCap',
	request: {
		query: GetTokensQuotesParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.array(TokenQuote)
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
		},
		502: {
			description: 'Upstream Error (CoinMarketCap)',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};
