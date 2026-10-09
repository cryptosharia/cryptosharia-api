import { describe, expect, it, vi } from 'vitest';
import { MarketDataAdapter } from './market-data.adapter';

describe('MarketDataAdapter', () => {
  const config = { getOrThrow: vi.fn().mockReturnValue('cmc-api-key') };

  it('maps CoinMarketCap quotes into the application shape with skip_invalid=true', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            bitcoin: {
              slug: 'bitcoin',
              cmc_rank: 1,
              infinite_supply: false,
              max_supply: 21_000_000,
              circulating_supply: 19_000_000,
              quote: {
                USD: {
                  price: 100_000,
                  market_cap: 1_900_000_000_000,
                  market_cap_dominance: 55.5,
                  percent_change_24h: 1.2,
                },
              },
            },
          },
        }),
        { status: 200 },
      ),
    );
    const adapter = new MarketDataAdapter(config as never);

    await expect(adapter.getQuotes({ slugs: ['bitcoin'] })).resolves.toEqual([
      {
        slug: 'bitcoin',
        rank: 1,
        infiniteSupply: false,
        maxSupply: 21_000_000,
        circulatingSupply: 19_000_000,
        priceUsd: 100_000,
        marketCapUsd: 1_900_000_000_000,
        marketCapDominance: 55.5,
        percentChange24h: 1.2,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=bitcoin&skip_invalid=true',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'X-CMC_PRO_API_KEY': 'cmc-api-key',
        },
      }),
    );
    fetchMock.mockRestore();
  });

  it('resolves USDC alias to usd-coin on CMC and maps back to original slug', async () => {
    let calledUrl = '';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url) => {
        calledUrl =
          typeof url === 'string'
            ? url
            : url instanceof URL
              ? url.href
              : url.url;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                'usd-coin': {
                  slug: 'usd-coin',
                  cmc_rank: 6,
                  infinite_supply: true,
                  max_supply: null,
                  circulating_supply: 35_000_000_000,
                  quote: {
                    USD: {
                      price: 1.0,
                      market_cap: 35_000_000_000,
                      market_cap_dominance: 2.1,
                      percent_change_24h: 0.01,
                    },
                  },
                },
              },
            }),
            { status: 200 },
          ),
        );
      });
    const adapter = new MarketDataAdapter(config as never);

    const quotes = await adapter.getQuotes({ slugs: ['usdc'] });
    expect(calledUrl).toContain('slug=usd-coin');
    expect(calledUrl).toContain('&skip_invalid=true');
    expect(quotes).toEqual([
      {
        slug: 'usdc',
        rank: 6,
        infiniteSupply: true,
        maxSupply: null,
        circulatingSupply: 35_000_000_000,
        priceUsd: 1.0,
        marketCapUsd: 35_000_000_000,
        marketCapDominance: 2.1,
        percentChange24h: 0.01,
      },
    ]);
    fetchMock.mockRestore();
  });

  it('prevents collision when both alias and target slug are requested', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            'usd-coin': {
              slug: 'usd-coin',
              cmc_rank: 6,
              infinite_supply: true,
              max_supply: null,
              circulating_supply: 35_000_000_000,
              quote: {
                USD: {
                  price: 1.0,
                  market_cap: 35_000_000_000,
                  market_cap_dominance: 2.1,
                  percent_change_24h: 0.01,
                },
              },
            },
          },
        }),
        { status: 200 },
      ),
    );
    const adapter = new MarketDataAdapter(config as never);

    const quotes = await adapter.getQuotes({ slugs: ['usdc', 'usd-coin'] });
    expect(quotes).toHaveLength(2);
    expect(quotes.map((q) => q.slug)).toEqual(
      expect.arrayContaining(['usdc', 'usd-coin']),
    );
    fetchMock.mockRestore();
  });

  it('handles empty or skipped data gracefully by returning empty array', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 }),
      );
    const adapter = new MarketDataAdapter(config as never);

    await expect(
      adapter.getQuotes({ slugs: ['unlisted-coin'] }),
    ).resolves.toEqual([]);
    fetchMock.mockRestore();
  });

  it('omits quotes with missing or non-finite price to avoid zero price corruption', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            'no-price-coin': {
              slug: 'no-price-coin',
              cmc_rank: 999,
              infinite_supply: false,
              max_supply: 1000,
              circulating_supply: 500,
              quote: {
                USD: {
                  price: null,
                  market_cap: null,
                  market_cap_dominance: null,
                  percent_change_24h: null,
                },
              },
            },
          },
        }),
        { status: 200 },
      ),
    );
    const adapter = new MarketDataAdapter(config as never);

    const quotes = await adapter.getQuotes({ slugs: ['no-price-coin'] });
    expect(quotes).toEqual([]);
    fetchMock.mockRestore();
  });

  it('differentiates status codes and categories in diagnostic errors without exposing API key', async () => {
    const adapter = new MarketDataAdapter(config as never);
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // 400 Bad Request: MUST NOT be swallowed as empty array
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: { error_code: 400, error_message: 'Invalid slug syntax' },
        }),
        { status: 400 },
      ),
    );
    await expect(
      adapter.getQuotes({ slugs: ['invalid'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      statusCode: 400,
      category: 'BAD_REQUEST',
      diagnostics: {
        category: 'BAD_REQUEST',
        statusCode: 400,
        message: 'Invalid slug syntax',
        requestedCount: 1,
      },
    });

    // 401 Unauthorized
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      statusCode: 401,
      category: 'UNAUTHORIZED',
      diagnostics: {
        category: 'UNAUTHORIZED',
        statusCode: 401,
      },
    });

    // 403 Forbidden
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      statusCode: 403,
      category: 'FORBIDDEN',
      diagnostics: {
        category: 'FORBIDDEN',
        statusCode: 403,
      },
    });

    // 429 Rate Limit
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      statusCode: 429,
      category: 'RATE_LIMITED',
      diagnostics: {
        category: 'RATE_LIMITED',
        statusCode: 429,
      },
    });

    // 502 Upstream Bad Gateway
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      statusCode: 502,
      category: 'UPSTREAM_SERVER_ERROR',
      diagnostics: {
        category: 'UPSTREAM_SERVER_ERROR',
        statusCode: 502,
      },
    });

    // Network timeout
    fetchMock.mockRejectedValueOnce(
      new Error('AbortError: The operation was aborted due to timeout'),
    );
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
      category: 'NETWORK_ERROR',
      diagnostics: {
        category: 'NETWORK_ERROR',
      },
    });

    fetchMock.mockRestore();
  });
});
