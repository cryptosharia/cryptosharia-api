import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CryptoassetsService } from './cryptoassets.service';
import { MarketDataError } from '#src/modules/market-data/market-data.error';

describe('CryptoassetsService withQuotes & resilience', () => {
  const mockRepo = {
    selectAll: vi.fn(),
    count: vi.fn(),
    selectByIdentifier: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockTags = {
    resolveIdentifiers: vi.fn(),
  };

  const mockAssets = {
    toAssetMetadata: vi.fn().mockReturnValue(null),
  };

  const mockMarketData = {
    getQuotes: vi.fn(),
  };

  const mockAudit = {
    log: vi.fn(),
  };

  let service: CryptoassetsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CryptoassetsService(
      mockRepo as never,
      mockTags as never,
      mockAssets as never,
      mockMarketData as never,
      mockAudit as never,
    );
  });

  const sampleDbRecord = {
    cryptoasset: {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'usdc',
      name: 'USD Coin',
      ticker: 'USDC',
      shariaStatus: 'halal' as const,
      status: 'published' as const,
      excerpt: 'Stablecoin USD Coin',
      tradingviewSymbol: null,
      website: 'https://circle.com',
      logoId: '22222222-2222-2222-2222-222222222222',
      content: 'Kajian syariah mengenai USDC...',
      publishedAt: new Date('2026-10-09T13:00:00Z'),
      createdAt: new Date('2026-10-09T13:00:00Z'),
      updatedAt: new Date('2026-10-09T13:00:00Z'),
    },
    logo: null,
    tags: [],
    createdBy: null,
    updatedBy: null,
  };

  it('selectByIdentifier returns full Sharia detail with quote when market data succeeds', async () => {
    mockRepo.selectByIdentifier.mockResolvedValue(sampleDbRecord);
    mockMarketData.getQuotes.mockResolvedValue([
      {
        slug: 'usdc',
        rank: 6,
        infiniteSupply: true,
        maxSupply: null,
        circulatingSupply: 35000000000,
        priceUsd: 1.0,
        marketCapUsd: 35000000000,
        marketCapDominance: 2.1,
        percentChange24h: 0.01,
      },
    ]);

    const result = await service.selectByIdentifier(
      'usdc',
      { canViewNonPublished: false },
      true,
    );
    expect(result.slug).toBe('usdc');
    expect(result.shariaStatus).toBe('halal');
    expect(result.content).toBe('Kajian syariah mengenai USDC...');
    expect(result.quote).toMatchObject({ priceUsd: 1.0, rank: 6 });
  });

  it('selectByIdentifier degrades gracefully to quote: null when MarketDataError occurs', async () => {
    mockRepo.selectByIdentifier.mockResolvedValue(sampleDbRecord);
    mockMarketData.getQuotes.mockRejectedValue(
      new MarketDataError('QUOTES_FETCH_FAILED', 503),
    );

    const result = await service.selectByIdentifier(
      'usdc',
      { canViewNonPublished: false },
      true,
    );
    expect(result.slug).toBe('usdc');
    expect(result.shariaStatus).toBe('halal');
    expect(result.content).toBe('Kajian syariah mengenai USDC...');
    expect(result.quote).toBeNull();
  });

  it('selectAll degrades gracefully to quote: null for all items when market provider fails', async () => {
    mockRepo.selectAll.mockResolvedValue([sampleDbRecord]);
    mockMarketData.getQuotes.mockRejectedValue(
      new MarketDataError('QUOTES_FETCH_FAILED', 429),
    );

    const items = await service.selectAll({
      page: 1,
      limit: 20,
      quote: true,
    });

    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe('usdc');
    expect(items[0].shariaStatus).toBe('halal');
    expect(items[0].quote).toBeNull();
  });

  it('sets quote to null when an asset quote is omitted by market data (not artificial zero price)', async () => {
    mockRepo.selectAll.mockResolvedValue([sampleDbRecord]);
    // Market data provider returns empty quotes (e.g. quote omitted or unavailable)
    mockMarketData.getQuotes.mockResolvedValue([]);

    const items = await service.selectAll({
      page: 1,
      limit: 20,
      quote: true,
    });

    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe('usdc');
    expect(items[0].quote).toBeNull();
  });

  it('does NOT swallow database errors or non-MarketDataError exceptions', async () => {
    const dbError = new Error(
      'FATAL: connection to server at postgresql failed',
    );
    mockRepo.selectAll.mockRejectedValue(dbError);

    await expect(
      service.selectAll({ page: 1, limit: 20, quote: true }),
    ).rejects.toThrow(dbError);
  });
});
