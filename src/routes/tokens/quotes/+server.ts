import type { RequestHandler } from './$types';
import { CMC_API_KEY } from '$env/static/private';
import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import { ApiResponse } from '$lib/api';
import { parseQueryParams } from '$lib/api/request';
import { eq } from 'drizzle-orm';
import { TokensQuotesGetQuery, TokensQuotesGetItem } from '..';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const parsedQuery = parseQueryParams(url, TokensQuotesGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const { slugs } = parsedQuery.data;

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
			return ApiResponse.badGateway('Failed to fetch token quotes from external provider');
		}

		const json = await res.json();
		const cmcData = json.data;

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

		const quotes = await Promise.all(
			(Object.values(cmcData) as CMCQuote[]).map(async (quote) => {
				const data = {
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
		console.error('Fetch quotes error:', error);
		return ApiResponse.internalServerError('Failed to process token quotes');
	}
};
