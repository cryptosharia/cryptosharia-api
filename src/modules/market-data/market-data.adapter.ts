import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataError } from './market-data.error';

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
    let response: Response;
    try {
      response = await fetch(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${input.slugs.join(',')}`,
        {
          headers: {
            Accept: 'application/json',
            'X-CMC_PRO_API_KEY': this.apiKey,
          },
        },
      );
    } catch {
      throw new MarketDataError('QUOTES_FETCH_FAILED');
    }

    if (!response.ok) throw new MarketDataError('QUOTES_FETCH_FAILED');

    try {
      const { data } = (await response.json()) as CoinMarketCapResponse;
      if (!data) throw new MarketDataError('QUOTES_FETCH_FAILED');

      return Object.values(data).map((quote) => ({
        slug: quote.slug,
        rank: quote.cmc_rank,
        infiniteSupply: quote.infinite_supply,
        maxSupply: quote.max_supply,
        circulatingSupply: quote.circulating_supply,
        priceUsd: quote.quote.USD.price,
        marketCapUsd: quote.quote.USD.market_cap,
        marketCapDominance: quote.quote.USD.market_cap_dominance,
        percentChange24h: quote.quote.USD.percent_change_24h,
      }));
    } catch (error) {
      if (error instanceof MarketDataError) throw error;

      throw new MarketDataError('QUOTES_FETCH_FAILED');
    }
  }
}
