import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MarketDataDiagnostics,
  MarketDataError,
  MarketDataFailureCategory,
} from './market-data.error';

type CoinMarketCapResponse = {
  data?: Record<
    string,
    {
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
    }
  >;
};

export const SLUG_TO_CMC_ALIAS: Readonly<Record<string, string>> =
  Object.freeze({
    usdc: 'usd-coin',
  });

const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class MarketDataAdapter {
  private readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('CMC_API_KEY');
  }

  async getQuotes(input: { slugs: string[] }): Promise<
    {
      slug: string;
      rank: number;
      infiniteSupply: boolean;
      maxSupply: number | null;
      circulatingSupply: number;
      priceUsd: number;
      marketCapUsd: number;
      marketCapDominance: number;
      percentChange24h: number;
    }[]
  > {
    if (!input.slugs || !input.slugs.length) return [];

    // Map requested slugs to CMC slugs without collision
    const cmcSlugToRequestedSlugs = new Map<string, string[]>();
    for (const slug of input.slugs) {
      const cmcSlug = SLUG_TO_CMC_ALIAS[slug] ?? slug;
      const list = cmcSlugToRequestedSlugs.get(cmcSlug) ?? [];
      list.push(slug);
      cmcSlugToRequestedSlugs.set(cmcSlug, list);
    }
    const uniqueCmcSlugs = Array.from(cmcSlugToRequestedSlugs.keys());

    let response: Response;
    try {
      response = await fetch(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${uniqueCmcSlugs.join(',')}&skip_invalid=true`,
        {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            Accept: 'application/json',
            'X-CMC_PRO_API_KEY': this.apiKey,
          },
        },
      );
    } catch (networkError) {
      const isTimeout =
        networkError instanceof Error &&
        (networkError.name === 'TimeoutError' ||
          networkError.name === 'AbortError');
      const diagnostics: MarketDataDiagnostics = {
        category: 'NETWORK_ERROR',
        message: isTimeout
          ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : networkError instanceof Error
            ? networkError.message
            : 'Unknown network error',
        requestedCount: input.slugs.length,
      };
      console.error(
        '[MarketDataAdapter] CoinMarketCap request timeout or network error',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        undefined,
        'NETWORK_ERROR',
        diagnostics,
        networkError,
      );
    }

    if (response.status === 400) {
      const errorPayload = (await response.json().catch(() => null)) as {
        status?: { error_message?: string };
      } | null;
      const diagnostics: MarketDataDiagnostics = {
        category: 'BAD_REQUEST',
        statusCode: 400,
        message:
          errorPayload?.status?.error_message ??
          'Bad Request / Slug syntax rejected',
        requestedCount: input.slugs.length,
      };
      console.warn(
        '[MarketDataAdapter] CoinMarketCap 400 Bad Request: Parameter or slug syntax rejected',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        400,
        'BAD_REQUEST',
        diagnostics,
      );
    }

    if (response.status === 401 || response.status === 403) {
      const category: MarketDataFailureCategory =
        response.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
      const diagnostics: MarketDataDiagnostics = {
        category,
        statusCode: response.status,
        message:
          response.status === 401
            ? 'API key invalid or missing'
            : 'Access forbidden for current API key plan',
        requestedCount: input.slugs.length,
      };
      console.error(
        '[MarketDataAdapter] CoinMarketCap Authentication / Permission Error',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        response.status,
        category,
        diagnostics,
      );
    }

    if (response.status === 429) {
      const diagnostics: MarketDataDiagnostics = {
        category: 'RATE_LIMITED',
        statusCode: 429,
        message: 'Rate limit or monthly credit quota exceeded',
        requestedCount: input.slugs.length,
      };
      console.warn(
        '[MarketDataAdapter] CoinMarketCap Rate Limit / Quota Exceeded',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        429,
        'RATE_LIMITED',
        diagnostics,
      );
    }

    if (response.status >= 500) {
      const diagnostics: MarketDataDiagnostics = {
        category: 'UPSTREAM_SERVER_ERROR',
        statusCode: response.status,
        message: `Upstream server error (${response.status})`,
        requestedCount: input.slugs.length,
      };
      console.error(
        '[MarketDataAdapter] CoinMarketCap Upstream Server Error',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        response.status,
        'UPSTREAM_SERVER_ERROR',
        diagnostics,
      );
    }

    if (!response.ok) {
      const diagnostics: MarketDataDiagnostics = {
        category: 'UPSTREAM_SERVER_ERROR',
        statusCode: response.status,
        message: `Unexpected HTTP status ${response.status}`,
        requestedCount: input.slugs.length,
      };
      console.error(
        '[MarketDataAdapter] CoinMarketCap request failed',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        response.status,
        'UPSTREAM_SERVER_ERROR',
        diagnostics,
      );
    }

    try {
      const payload = (await response.json()) as CoinMarketCapResponse;
      const data = payload?.data;
      if (!data || typeof data !== 'object') {
        return [];
      }

      const results: Array<{
        slug: string;
        rank: number;
        infiniteSupply: boolean;
        maxSupply: number | null;
        circulatingSupply: number;
        priceUsd: number;
        marketCapUsd: number;
        marketCapDominance: number;
        percentChange24h: number;
      }> = [];

      for (const quote of Object.values(data)) {
        if (
          !quote ||
          typeof quote !== 'object' ||
          !quote.slug ||
          !quote.quote?.USD
        ) {
          continue;
        }

        const usd = quote.quote.USD;
        // Priority 2: Unavailable quote must be null, not zero price.
        // If price is missing or not a finite number, omit it so consumer gets null.
        if (typeof usd.price !== 'number' || !Number.isFinite(usd.price)) {
          continue;
        }

        const requestedSlugs = cmcSlugToRequestedSlugs.get(quote.slug) ?? [
          quote.slug,
        ];
        for (const requestedSlug of requestedSlugs) {
          results.push({
            slug: requestedSlug,
            rank:
              typeof quote.cmc_rank === 'number' &&
              Number.isFinite(quote.cmc_rank)
                ? quote.cmc_rank
                : 0,
            infiniteSupply: Boolean(quote.infinite_supply),
            maxSupply:
              typeof quote.max_supply === 'number' &&
              Number.isFinite(quote.max_supply)
                ? quote.max_supply
                : null,
            circulatingSupply:
              typeof quote.circulating_supply === 'number' &&
              Number.isFinite(quote.circulating_supply)
                ? quote.circulating_supply
                : 0,
            priceUsd: usd.price,
            marketCapUsd:
              typeof usd.market_cap === 'number' &&
              Number.isFinite(usd.market_cap)
                ? usd.market_cap
                : 0,
            marketCapDominance:
              typeof usd.market_cap_dominance === 'number' &&
              Number.isFinite(usd.market_cap_dominance)
                ? usd.market_cap_dominance
                : 0,
            percentChange24h:
              typeof usd.percent_change_24h === 'number' &&
              Number.isFinite(usd.percent_change_24h)
                ? usd.percent_change_24h
                : 0,
          });
        }
      }

      return results;
    } catch (error) {
      if (error instanceof MarketDataError) throw error;

      const diagnostics: MarketDataDiagnostics = {
        category: 'MALFORMED_RESPONSE',
        statusCode: response.status,
        message:
          error instanceof Error ? error.message : 'Unknown parsing error',
        requestedCount: input.slugs.length,
      };
      console.error(
        '[MarketDataAdapter] Malformed CoinMarketCap response payload',
        diagnostics,
      );
      throw new MarketDataError(
        'QUOTES_FETCH_FAILED',
        response.status,
        'MALFORMED_RESPONSE',
        diagnostics,
        error,
      );
    }
  }
}
