const defaultQuote = (slug: string) => ({
  slug,
  rank: 1,
  infiniteSupply: false,
  maxSupply: null,
  circulatingSupply: 1000000,
  priceUsd: 100,
  marketCapUsd: 100000000,
  marketCapDominance: 1.5,
  percentChange24h: 2.5,
});

export class TestMarketDataService {
  getQuotes = vi.fn((input: { slugs: string[] }) =>
    input.slugs.map(defaultQuote),
  );

  reset() {
    this.getQuotes
      .mockReset()
      .mockImplementation((input: { slugs: string[] }) =>
        input.slugs.map(defaultQuote),
      );
  }
}
