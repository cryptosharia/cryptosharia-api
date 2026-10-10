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

  it('correctly parses CoinMarketCap v2 multi-slug responses returning array of records per slug', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            bitcoin: [
              {
                id: 1,
                slug: 'bitcoin',
                cmc_rank: 1,
                infinite_supply: false,
                max_supply: 21_000_000,
                circulating_supply: 19_000_000,
                quote: {
                  USD: {
                    price: 90_000,
                    market_cap: 1_800_000_000_000,
                    market_cap_dominance: 54.0,
                    percent_change_24h: 2.5,
                  },
                },
              },
            ],
            ethereum: [
              {
                id: 1027,
                slug: 'ethereum',
                cmc_rank: 2,
                infinite_supply: true,
                max_supply: null,
                circulating_supply: 120_000_000,
                quote: {
                  USD: {
                    price: 3_000,
                    market_cap: 360_000_000_000,
                    market_cap_dominance: 14.2,
                    percent_change_24h: -1.1,
                  },
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const adapter = new MarketDataAdapter(config as never);

    const quotes = await adapter.getQuotes({ slugs: ['bitcoin', 'ethereum'] });
    expect(quotes).toHaveLength(2);
    expect(quotes).toEqual([
      {
        slug: 'bitcoin',
        rank: 1,
        infiniteSupply: false,
        maxSupply: 21_000_000,
        circulatingSupply: 19_000_000,
        priceUsd: 90_000,
        marketCapUsd: 1_800_000_000_000,
        marketCapDominance: 54.0,
        percentChange24h: 2.5,
      },
      {
        slug: 'ethereum',
        rank: 2,
        infiniteSupply: true,
        maxSupply: null,
        circulatingSupply: 120_000_000,
        priceUsd: 3_000,
        marketCapUsd: 360_000_000_000,
        marketCapDominance: 14.2,
        percentChange24h: -1.1,
      },
    ]);
    fetchMock.mockRestore();
  });

  it('splits large batch requests (>20 slugs) into chunks to avoid single point of failure', async () => {
    const urlsCalled: string[] = [];
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url) => {
        urlsCalled.push(typeof url === 'string' ? url : (url as URL).href);
        return Promise.resolve(
          new Response(JSON.stringify({ data: {} }), { status: 200 }),
        );
      });
    const adapter = new MarketDataAdapter(config as never);

    const manySlugs = Array.from({ length: 35 }, (_, i) => `token-${i}`);
    await adapter.getQuotes({ slugs: manySlugs });

    // 35 slugs chunked by 20 results in 2 fetch calls
    expect(urlsCalled).toHaveLength(2);
    expect(urlsCalled[0]).toContain('slug=token-0,token-1');
    expect(urlsCalled[1]).toContain('slug=token-20,token-21');
    fetchMock.mockRestore();
  });

  it('preserves quotes from successful chunks when one chunk fails', async () => {
    let callIndex = 0;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // First chunk succeeds
          return Promise.resolve(
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
                        price: 90_000,
                        market_cap: 1_800_000_000_000,
                        market_cap_dominance: 54.0,
                        percent_change_24h: 2.5,
                      },
                    },
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }
        // Second chunk fails with 500
        return Promise.resolve(new Response('Internal Server Error', { status: 500 }));
      });
    const adapter = new MarketDataAdapter(config as never);

    // 21 slugs -> chunk 1 has 20 slugs, chunk 2 has 1 slug
    const slugs = ['bitcoin', ...Array.from({ length: 20 }, (_, i) => `other-${i}`)];
    const quotes = await adapter.getQuotes({ slugs });

    // Bitcoin from chunk 1 was rescued and returned despite chunk 2 failure!
    expect(quotes).toHaveLength(1);
    expect(quotes[0].slug).toBe('bitcoin');
    expect(quotes[0].priceUsd).toBe(90_000);
    fetchMock.mockRestore();
  });

  it('serves repeated requests from in-memory cache without hitting CoinMarketCap again', async () => {
    let fetchCount = 0;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => {
        fetchCount++;
        return Promise.resolve(
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
                      price: 90_000,
                      market_cap: 1_800_000_000_000,
                      market_cap_dominance: 54.0,
                      percent_change_24h: 2.5,
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

    const first = await adapter.getQuotes({ slugs: ['bitcoin'] });
    const second = await adapter.getQuotes({ slugs: ['bitcoin'] });

    expect(fetchCount).toBe(1);
    expect(first).toEqual(second);
    fetchMock.mockRestore();
  });

  it('disambiguates duplicate token candidates for the same slug by highest rank and market cap', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            pepe: [
              {
                id: 99999,
                slug: 'pepe',
                cmc_rank: 3500,
                infinite_supply: true,
                max_supply: null,
                circulating_supply: 100_000,
                quote: {
                  USD: {
                    price: 0.0000001,
                    market_cap: 10_000,
                    market_cap_dominance: 0,
                    percent_change_24h: 1.0,
                  },
                },
              },
              {
                id: 24478,
                slug: 'pepe',
                cmc_rank: 25,
                infinite_supply: false,
                max_supply: 420_690_000_000_000,
                circulating_supply: 420_690_000_000_000,
                quote: {
                  USD: {
                    price: 0.00001,
                    market_cap: 4_200_000_000,
                    market_cap_dominance: 0.15,
                    percent_change_24h: 5.2,
                  },
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const adapter = new MarketDataAdapter(config as never);

    const quotes = await adapter.getQuotes({ slugs: ['pepe'] });
    expect(quotes).toHaveLength(1);
    expect(quotes[0].rank).toBe(25);
    expect(quotes[0].marketCapUsd).toBe(4_200_000_000);
    fetchMock.mockRestore();
  });
});
