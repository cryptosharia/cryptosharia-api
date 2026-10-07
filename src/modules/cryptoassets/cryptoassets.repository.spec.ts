import { NeonDbError } from '@neondatabase/serverless';
import { DrizzleQueryError } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CryptoassetsRepository } from './cryptoassets.repository';

const assetId = 'e1a9cf31-d6fb-4d20-b785-c5b1ac810920';
const userId = 'e1a9cf31-d6fb-4d20-b785-c5b1ac810921';

const insertInput: Parameters<CryptoassetsRepository['insert']>[0] = {
  slug: 'test-asset',
  name: 'Test Asset',
  ticker: 'TST',
  shariaStatus: 'halal',
  status: 'draft',
  excerpt: 'Test asset',
  tradingviewSymbol: null,
  website: 'https://example.com',
  logoId: assetId,
  content: 'Test asset content',
  publishedAt: null,
  createdBy: userId,
  updatedBy: userId,
  tagIds: [],
};

function createRepositoryWithInsertError(error: Error) {
  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockRejectedValue(error),
      })),
    })),
  };
  const drizzleService = {
    db: {
      transaction: vi.fn(
        async (callback: (transaction: unknown) => Promise<unknown>) =>
          callback(tx),
      ),
    },
  };

  return new CryptoassetsRepository(drizzleService as never);
}

describe('CryptoassetsRepository database error mapping', () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    {
      constraint: 'cryptoassets_slug_unique',
      expectedCode: 'SLUG_CONFLICT',
    },
    {
      constraint: 'cryptoassets_ticker_unique',
      expectedCode: 'TICKER_CONFLICT',
    },
  ])(
    'maps Neon serverless unique violation for $constraint',
    async ({ constraint, expectedCode }) => {
      const neonError = Object.assign(
        new NeonDbError('duplicate key violates unique constraint'),
        { code: '23505', constraint },
      );
      const queryError = new DrizzleQueryError(
        'insert into cryptoassets',
        [],
        neonError,
      );
      const repository = createRepositoryWithInsertError(queryError);

      await expect(repository.insert(insertInput)).rejects.toMatchObject({
        code: expectedCode,
      });
    },
  );
});
