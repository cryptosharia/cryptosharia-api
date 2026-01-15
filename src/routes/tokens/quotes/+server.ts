import { CMC_API_KEY } from '$env/static/private';
import { db } from '$lib/db';
import { tokens } from '$lib/db/schema';
import type { ApiResponse } from '$lib/types';
import { eq } from 'drizzle-orm';
import z from '$lib/zod-openapi';
import { GetTokensQuotesParams, TokenQuote } from '.';

export async function GET({ url, fetch }) {
	const result = GetTokensQuotesParams.safeParse(Object.fromEntries(url.searchParams));

	if (!result.success) {
		return Response.json(
			{
				success: false,
				message: 'Invalid query parameters',
				errors: z.flattenError(result.error).fieldErrors
			} satisfies ApiResponse<undefined>,
			{ status: 400 }
		);
	}

	const { slugs } = result.data;

	try {
		const res = await fetch(
			`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${slugs}`,
			{
				headers: {
					Accept: 'application/json',
					'X-CMC_PRO_API_KEY': CMC_API_KEY
				}
			}
		);

		if (!res.ok) {
			console.error(`CMC Fetch Error: ${res.statusText}`);
			return Response.json(
				{
					success: false,
					message: 'Failed to fetch quotes from upstream provider'
				} satisfies ApiResponse,
				{ status: 502 }
			);
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
				const data: z.infer<typeof TokenQuote> = {
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

				// Update local database rank (fire and forget)
				db.update(tokens)
					.set({ rank: data.rank })
					.where(eq(tokens.slug, data.slug))
					.catch((err) => console.error(`Failed to update rank for ${data.slug}:`, err));

				return data;
			})
		);

		return Response.json({
			success: true,
			message: 'Token quotes fetched successfully',
			data: quotes
		} satisfies ApiResponse);
	} catch (error) {
		console.error('/tokens/quotes Error:', error);
		return Response.json(
			{ success: false, message: 'Internal Server Error' } satisfies ApiResponse,
			{ status: 500 }
		);
	}
}
