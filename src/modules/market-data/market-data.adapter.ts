import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '#src/modules/redis/redis.service';
import {
  MarketDataDiagnostics,
  MarketDataError,
  MarketDataFailureCategory,
} from './market-data.error';

export type MarketDataQuote = {
  slug: string;
  rank: number;
  infiniteSupply: boolean;
  maxSupply: number | null;
  circulatingSupply: number;
  priceUsd: number;
  marketCapUsd: number;
  marketCapDominance: number;
  percentChange24h: number;
};

interface CachedQuoteEntry {
  quote: MarketDataQuote;
  cachedAt: number;
}

export const SLUG_TO_CMC_ALIAS: Readonly<Record<string, string>> =
  Object.freeze({
    usdc: 'usd-coin',
  });

const REQUEST_TIMEOUT_MS = 5000;
const BATCH_CHUNK_SIZE = 20;
const CACHE_TTL_MS = 60_000;
const REDIS_KEY_PREFIX = 'market:quote:';

@Injectable()
export class MarketDataAdapter {
  private readonly apiKey: string;
  private readonly quoteCache = new Map<string, CachedQuoteEntry>();
  private readonly inFlightChunks = new Map<
    string,
    Promise<MarketDataQuote[]>
  >();

  constructor(
    configService: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {
    this.apiKey = configService.getOrThrow<string>('CMC_API_KEY');
  }

  /**
   * Clears the in-memory quote cache and in-flight promises (for testing resets).
   */
  clearCache(): void {
    this.quoteCache.clear();
    this.inFlightChunks.clear();
  }

  async getQuotes(input: { slugs: string[] }): Promise<MarketDataQuote[]> {
    if (!input.slugs || !input.slugs.length) return [];

    const now = Date.now();
    const resultsBySlug = new Map<string, MarketDataQuote>();
    const missingSlugs: string[] = [];

    // 1. Check in-memory quote cache first
    const uniqueRequestedSlugs = Array.from(new Set(input.slugs));
    for (const slug of uniqueRequestedSlugs) {
      const cached = this.quoteCache.get(slug);
      if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
        resultsBySlug.set(slug, cached.quote);
      } else {
        const cmcAlias = SLUG_TO_CMC_ALIAS[slug];
        const aliasCached = cmcAlias
          ? this.quoteCache.get(cmcAlias)
          : undefined;
        if (aliasCached && now - aliasCached.cachedAt < CACHE_TTL_MS) {
          const aliasQuote = { ...aliasCached.quote, slug };
          resultsBySlug.set(slug, aliasQuote);
          this.quoteCache.set(slug, {
            quote: aliasQuote,
            cachedAt: aliasCached.cachedAt,
          });
        } else {
          missingSlugs.push(slug);
        }
      }
    }

    // 2. Check Redis cache (if configured) for missing slugs across instances
    if (
      missingSlugs.length > 0 &&
      this.redisService &&
      this.redisService.isConfigured !== false
    ) {
      const remainingMissing: string[] = [];
      await Promise.all(
        missingSlugs.map(async (slug) => {
          try {
            const raw = await this.redisService!.get(
              `${REDIS_KEY_PREFIX}${slug}`,
            );
            let parsed: MarketDataQuote | null = null;
            if (raw) {
              if (typeof raw === 'string') {
                try {
                  parsed = JSON.parse(raw) as MarketDataQuote;
                } catch {
                  parsed = null;
                }
              } else if (typeof raw === 'object' && raw !== null) {
                parsed = raw;
              }
            } else {
              const cmcAlias = SLUG_TO_CMC_ALIAS[slug];
              if (cmcAlias) {
                const aliasRaw = await this.redisService!.get(
                  `${REDIS_KEY_PREFIX}${cmcAlias}`,
                );
                if (aliasRaw) {
                  if (typeof aliasRaw === 'string') {
                    try {
                      parsed = JSON.parse(aliasRaw) as MarketDataQuote;
                    } catch {
                      parsed = null;
                    }
                  } else if (
                    typeof aliasRaw === 'object' &&
                    aliasRaw !== null
                  ) {
                    parsed = aliasRaw;
                  }
                  if (parsed) {
                    parsed = { ...parsed, slug };
                  }
                }
              }
            }
            if (parsed?.slug && typeof parsed.priceUsd === 'number') {
              resultsBySlug.set(slug, parsed);
              this.quoteCache.set(slug, { quote: parsed, cachedAt: now });
              return;
            }
          } catch {
            // Redis error must fail open to allow CMC fetch without breaking user request
          }
          remainingMissing.push(slug);
        }),
      );
      missingSlugs.length = 0;
      missingSlugs.push(...remainingMissing);
    }

    // If all requested slugs are satisfied from cache, return immediately
    if (missingSlugs.length === 0) {
      return input.slugs
        .map((slug) => resultsBySlug.get(slug))
        .filter((quote): quote is MarketDataQuote => Boolean(quote));
    }

    // Map missing slugs to CoinMarketCap slugs (e.g. usdc -> usd-coin)
    const cmcSlugToRequestedSlugs = new Map<string, string[]>();
    for (const slug of missingSlugs) {
      const cmcSlug = SLUG_TO_CMC_ALIAS[slug] ?? slug;
      const list = cmcSlugToRequestedSlugs.get(cmcSlug) ?? [];
      list.push(slug);
      cmcSlugToRequestedSlugs.set(cmcSlug, list);
    }
    const uniqueCmcSlugs = Array.from(cmcSlugToRequestedSlugs.keys());

    // Split requests into resilient small batches (strictly at most 20 per request)
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueCmcSlugs.length; i += BATCH_CHUNK_SIZE) {
      chunks.push(uniqueCmcSlugs.slice(i, i + BATCH_CHUNK_SIZE));
    }

    // Singleflight / request coalescing: deduplicate concurrent fetches for identical chunks
    // The in-flight promise returns CANONICAL quotes keyed by their CMC slug.
    const chunkPromises = chunks.map((chunkSlugs) => {
      const cacheKey = [...chunkSlugs].sort().join(',');
      const inFlight = this.inFlightChunks.get(cacheKey);
      if (inFlight) return inFlight;

      const promise = this.fetchChunk(chunkSlugs).finally(() => {
        this.inFlightChunks.delete(cacheKey);
      });
      this.inFlightChunks.set(cacheKey, promise);
      return promise;
    });

    const chunkResults = await Promise.allSettled(chunkPromises);

    let anyChunkSucceeded = false;
    let firstError: MarketDataError | null = null;

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        anyChunkSucceeded = true;
        for (const canonicalQuote of result.value) {
          const mappedSlugs = cmcSlugToRequestedSlugs.get(
            canonicalQuote.slug,
          ) ?? [canonicalQuote.slug];
          for (const targetSlug of mappedSlugs) {
            const quoteForTarget = { ...canonicalQuote, slug: targetSlug };
            resultsBySlug.set(targetSlug, quoteForTarget);
            this.quoteCache.set(targetSlug, {
              quote: quoteForTarget,
              cachedAt: now,
            });
            if (this.redisService && this.redisService.isConfigured !== false) {
              this.redisService
                .setEx(
                  `${REDIS_KEY_PREFIX}${targetSlug}`,
                  60,
                  JSON.stringify(quoteForTarget),
                )
                .catch(() => {});
            }
          }
          // Also cache under canonical slug in memory and Redis
          this.quoteCache.set(canonicalQuote.slug, {
            quote: canonicalQuote,
            cachedAt: now,
          });
          if (this.redisService && this.redisService.isConfigured !== false) {
            this.redisService
              .setEx(
                `${REDIS_KEY_PREFIX}${canonicalQuote.slug}`,
                60,
                JSON.stringify(canonicalQuote),
              )
              .catch(() => {});
          }
        }
      } else {
        const error: unknown = result.reason;
        if (error instanceof MarketDataError && !firstError) {
          firstError = error;
        }
        console.warn(
          '[MarketDataAdapter] Partial chunk quote fetch failed:',
          error instanceof Error ? error.message : error,
        );
      }
    }

    // If ALL chunks failed and we have no cached results for the requested slugs, rethrow the error
    if (!anyChunkSucceeded && resultsBySlug.size === 0 && firstError) {
      throw firstError;
    }

    return input.slugs
      .map((slug) => resultsBySlug.get(slug))
      .filter((quote): quote is MarketDataQuote => Boolean(quote));
  }

  private async fetchChunk(cmcSlugs: string[]): Promise<MarketDataQuote[]> {
    let response: Response;
    try {
      response = await fetch(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${cmcSlugs.join(',')}&skip_invalid=true`,
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
        requestedCount: cmcSlugs.length,
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
        requestedCount: cmcSlugs.length,
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
        requestedCount: cmcSlugs.length,
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
        requestedCount: cmcSlugs.length,
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
        requestedCount: cmcSlugs.length,
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
        requestedCount: cmcSlugs.length,
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
      const payload = (await response.json()) as {
        data?: unknown;
        status?: {
          error_code?: number | string;
          error_message?: string | null;
          credit_count?: number;
        };
      };

      // Review Provider error_code even when HTTP 200 is returned (handles both number and string)
      const rawErrorCode = payload?.status?.error_code;
      const errorCodeNum =
        rawErrorCode !== undefined && rawErrorCode !== null
          ? Number(rawErrorCode)
          : 0;

      if (Number.isFinite(errorCodeNum) && errorCodeNum !== 0) {
        const isRateLimit = errorCodeNum === 1008;
        const category: MarketDataFailureCategory = isRateLimit
          ? 'RATE_LIMITED'
          : 'UPSTREAM_SERVER_ERROR';
        const diagnostics: MarketDataDiagnostics = {
          category,
          statusCode: 200,
          message:
            payload.status?.error_message ??
            `CoinMarketCap status error_code ${rawErrorCode}`,
          requestedCount: cmcSlugs.length,
        };
        console.warn(
          '[MarketDataAdapter] CoinMarketCap response reported non-zero status.error_code',
          diagnostics,
        );
        throw new MarketDataError(
          'QUOTES_FETCH_FAILED',
          200,
          category,
          diagnostics,
        );
      }

      const data = payload?.data;
      if (!data || typeof data !== 'object') {
        return [];
      }

      // Collect raw entries preserving key if present:
      // 1. Map of arrays: { [slug]: Quote[] }
      // 2. Map of objects: { [slug]: Quote }
      // 3. Array of objects: Quote[]
      const rawEntries: Array<{ keySlug: string; item: unknown }> = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          rawEntries.push({ keySlug: '', item });
        }
      } else {
        for (const [key, val] of Object.entries(
          data as Record<string, unknown>,
        )) {
          if (Array.isArray(val)) {
            for (const item of val) {
              rawEntries.push({ keySlug: key, item });
            }
          } else {
            rawEntries.push({ keySlug: key, item: val });
          }
        }
      }

      const candidateQuotesBySlug = new Map<string, MarketDataQuote[]>();

      for (const { keySlug, item } of rawEntries) {
        if (!item || typeof item !== 'object') continue;
        const quote = item as {
          slug?: string;
          cmc_rank?: number | null;
          infinite_supply?: boolean | null;
          max_supply?: number | null;
          circulating_supply?: number | null;
          quote?: {
            USD?: {
              price?: number | null;
              market_cap?: number | null;
              market_cap_dominance?: number | null;
              percent_change_24h?: number | null;
            };
          };
        };

        const resolvedSlug = (
          typeof quote.slug === 'string' && quote.slug.trim().length > 0
            ? quote.slug.trim()
            : keySlug
        ).toLowerCase();

        if (!resolvedSlug || !quote.quote?.USD) {
          continue;
        }

        const usd = quote.quote.USD;
        // Priority 2 & 9: Unavailable or non-finite price MUST NOT be synthesized as 0.
        // Omit quotes with invalid/missing price so consumer receives null.
        if (
          typeof usd.price !== 'number' ||
          !Number.isFinite(usd.price) ||
          usd.price <= 0
        ) {
          continue;
        }

        // Priority 9: Do NOT synthesize 0 for unknown market cap, rank, or percentChange24h.
        // Omit quotes with non-positive/unknown market cap or rank so consumer gets null.
        if (
          typeof usd.market_cap !== 'number' ||
          !Number.isFinite(usd.market_cap) ||
          usd.market_cap <= 0
        ) {
          continue;
        }

        if (
          typeof quote.cmc_rank !== 'number' ||
          !Number.isFinite(quote.cmc_rank) ||
          quote.cmc_rank <= 0
        ) {
          continue;
        }

        if (
          typeof usd.percent_change_24h !== 'number' ||
          !Number.isFinite(usd.percent_change_24h)
        ) {
          continue;
        }

        const parsedQuote: MarketDataQuote = {
          slug: resolvedSlug,
          rank: quote.cmc_rank,
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
          marketCapUsd: usd.market_cap,
          marketCapDominance:
            typeof usd.market_cap_dominance === 'number' &&
            Number.isFinite(usd.market_cap_dominance)
              ? usd.market_cap_dominance
              : 0,
          percentChange24h: usd.percent_change_24h,
        };

        const list = candidateQuotesBySlug.get(resolvedSlug) ?? [];
        list.push(parsedQuote);
        candidateQuotesBySlug.set(resolvedSlug, list);
      }

      // Disambiguate duplicate candidates for each canonical slug
      const results: MarketDataQuote[] = [];
      for (const candidates of candidateQuotesBySlug.values()) {
        if (candidates.length === 1) {
          results.push(candidates[0]);
        } else if (candidates.length > 1) {
          candidates.sort((a, b) => {
            if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
            return b.marketCapUsd - a.marketCapUsd;
          });
          results.push(candidates[0]);
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
        requestedCount: cmcSlugs.length,
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
