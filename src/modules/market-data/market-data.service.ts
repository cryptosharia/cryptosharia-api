import { Injectable } from '@nestjs/common';
import { MarketDataAdapter } from './market-data.adapter';

@Injectable()
export class MarketDataService {
  constructor(private readonly marketDataAdapter: MarketDataAdapter) {}

  getQuotes(input: { slugs: string[] }) {
    return this.marketDataAdapter.getQuotes(input);
  }
}
