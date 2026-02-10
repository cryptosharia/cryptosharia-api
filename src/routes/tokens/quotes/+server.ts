import { CMC_API_KEY } from '$env/static/private';
import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import { eq } from 'drizzle-orm';
import z from '$lib/zod-openapi';
import { TokensQuotesGetQuery, TokensQuotesGetItem } from '..';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const params = Object.fromEntries(url.searchParams);
	const result = TokensQuotesGetQuery.safeParse(params);

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { slugs } = result.data;

	try {
		const res = await fetch(
			`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${(slugs as string[]).join(',')}`,
			{
				headers: {
					Accept: 'application/json',
					'X-CMC_PRO_API_KEY': CMC_API_KEY
				}
			}
		);

		if (!res.ok) {
			console.error(`CMC Fetch Error: ${res.statusText}`);
			return ApiResponse.badGateway();
		}

		const json = await res.json();
		const cmcData = json.data;

		// Type definitions based on CoinMarketCap API response
		type CMCQuote = {
			slug: string;
			cmc_rank: number;
			infinite_supply: boolean;
			max_supply: number | null;
			circulating_supply: number;
			quote: {
				USD: {
					price: number;
					market_cap: number;
					market_cap_dominance: number;
					percent_change_24h: number;
				};
			};
		};

		// Map and update concurrently
		const quotes = await Promise.all(
			(Object.values(cmcData) as CMCQuote[]).map(async (quote) => {
				// Normalize data structure
				const data: z.infer<typeof TokensQuotesGetItem> = {
					slug: quote.slug,
					rank: quote.cmc_rank,
					infiniteSupply: quote.infinite_supply,
					maxSupply: quote.max_supply,
					circulatingSupply: quote.circulating_supply,
					priceUsd: quote.quote.USD.price,
					marketCapUsd: quote.quote.USD.market_cap,
					marketCapDominance: quote.quote.USD.market_cap_dominance,
					percentChange24h: quote.quote.USD.percent_change_24h
				};

				db.update(tokens)
					.set({ rank: data.rank })
					.where(eq(tokens.slug, data.slug))
					.catch((err) => console.error(`Failed to update rank for ${data.slug}:`, err));

				return data;
			})
		);

		return ApiResponse.ok(
			quotes.map((q) => TokensQuotesGetItem.parse({ ...q })),
			'Token quotes retrieved successfully'
		);
	} catch (error) {
		console.error('/tokens/quotes Error:', error);
		return ApiResponse.internalServerError();
	}
};
