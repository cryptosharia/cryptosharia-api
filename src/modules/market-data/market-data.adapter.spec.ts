import { describe, expect, it, vi } from 'vitest';
import { MarketDataAdapter } from './market-data.adapter';

describe('MarketDataAdapter', () => {
  const config = { getOrThrow: vi.fn().mockReturnValue('cmc-api-key') };

  it('maps CoinMarketCap quotes into the application shape', async () => {
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
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=bitcoin',
      {
        headers: {
          Accept: 'application/json',
          'X-CMC_PRO_API_KEY': 'cmc-api-key',
        },
      },
    );
    fetchMock.mockRestore();
  });

  it('maps network, provider, and malformed responses to a domain error', async () => {
    const adapter = new MarketDataAdapter(config as never);
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
    });

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
    });

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(
      adapter.getQuotes({ slugs: ['bitcoin'] }),
    ).rejects.toMatchObject({
      code: 'QUOTES_FETCH_FAILED',
    });
    fetchMock.mockRestore();
  });
});
