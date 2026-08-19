import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { MarketDataError } from '#src/modules/market-data/market-data.error';
import { assets, tags } from '#src/modules/drizzle/drizzle.schema';
import { Suite } from '#test/helpers/suite.base';
import { createSession as createSessionFor } from '#test/helpers/create-session';
import type { TestMarketDataService } from '#test/helpers/test-market-data.service';

export class CryptoassetsSuite extends Suite {
  register() {
    const db = () => this.ctx.app.get(DrizzleService).db;
    const marketData = () =>
      this.ctx.app.get<TestMarketDataService>(MarketDataService);
    const createSession = (
      email: string,
      role: 'member' | 'cryptoassets_manager' = 'member',
    ) =>
      createSessionFor(this.ctx, email, role).then(
        ({ accessToken }) => accessToken,
      );
    const createAsset = async (pathname = 'test/cryptoasset-logo.png') => {
      const [asset] = await db()
        .insert(assets)
        .values({
          pathname,
          filename: 'cryptoasset-logo.png',
          size: 1,
          mimeType: 'image/png',
          width: null,
          height: null,
          provider: 'vercel_blob',
        })
        .returning();
      return asset;
    };
    const createTag = async (name: string, slug: string) => {
      const [tag] = await db().insert(tags).values({ name, slug }).returning();
      return tag;
    };
    const cryptoassetBody = (input: {
      slug: string;
      rank: number;
      name: string;
      ticker: string;
      logoId: string;
      shariaStatus?: 'halal' | 'haram' | 'syubhat';
      status?: 'draft' | 'published' | 'archived';
      content?: string;
      tags?: string[];
      tradingviewSymbol?: string | null;
    }) => ({
      slug: input.slug,
      rank: input.rank,
      name: input.name,
      ticker: input.ticker,
      shariaStatus: input.shariaStatus ?? 'halal',
      status: input.status ?? 'draft',
      excerpt: 'Excerpt',
      tradingviewSymbol: input.tradingviewSymbol ?? null,
      website: 'https://example.com',
      logoId: input.logoId,
      content: input.content ?? 'Content',
      tags: input.tags ?? [],
    });

    describe('Cryptoassets', () => {
      describe('selectAll', () => {
        it('returns only published cryptoassets to a guest with a total-items header', async () => {
          const accessToken = await createSession(
            'cryptoasset-list@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'draft-cryptoasset',
              rank: 1,
              name: 'Draft Cryptoasset',
              ticker: 'DRFT',
              logoId: asset.id,
              status: 'draft',
            }),
            headers,
          });
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'published-cryptoasset',
              rank: 2,
              name: 'Published Cryptoasset',
              ticker: 'PUB',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/cryptoassets');
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data).toHaveLength(1);
          expect(data?.[0]?.slug).toBe('published-cryptoasset');
          expect(data?.[0]).not.toHaveProperty('content');
        });

        it('filters by sharia status and search', async () => {
          const accessToken = await createSession(
            'cryptoasset-filter@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'halal-coin',
              rank: 1,
              name: 'Halal Coin',
              ticker: 'HLC',
              logoId: asset.id,
              shariaStatus: 'halal',
              status: 'published',
            }),
            headers,
          });
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'haram-coin',
              rank: 2,
              name: 'Haram Coin',
              ticker: 'HRM',
              logoId: asset.id,
              shariaStatus: 'haram',
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET(
            '/cryptoassets',
            {
              params: { query: { shariaStatuses: ['haram'], search: 'Haram' } },
            },
          );
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data?.[0]?.slug).toBe('haram-coin');
        });

        it('rejects explicit non-published status filters without cryptoassets.manage', async () => {
          const accessToken = await createSession(
            'cryptoasset-guest@example.com',
          );
          const { response } = await this.ctx.client.GET('/cryptoassets', {
            params: { query: { statuses: ['draft'] } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });

        it('omits quotes by default and includes them when quote=true', async () => {
          const accessToken = await createSession(
            'cryptoasset-quote@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'quote-coin',
              rank: 1,
              name: 'Quote Coin',
              ticker: 'QTC',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const plain = await this.ctx.client.GET('/cryptoassets');
          expect(plain.response.status).toBe(200);
          expect(plain.data?.[0]).not.toHaveProperty('quote');

          const quoted = await this.ctx.client.GET('/cryptoassets', {
            params: { query: { quote: true } },
          });
          expect(quoted.response.status).toBe(200);
          expect(quoted.data?.[0]?.quote).toMatchObject({ priceUsd: 100 });
          expect(marketData().getQuotes).toHaveBeenCalledWith({
            slugs: ['quote-coin'],
          });
        });

        it('returns 502 when market data fails while quotes are requested', async () => {
          const accessToken = await createSession(
            'cryptoasset-quote-fail@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'fail-coin',
              rank: 1,
              name: 'Fail Coin',
              ticker: 'FAIL',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });
          marketData().getQuotes.mockRejectedValue(
            new MarketDataError('QUOTES_FETCH_FAILED'),
          );

          const { error, response } = await this.ctx.client.GET(
            '/cryptoassets',
            {
              params: { query: { quote: true } },
            },
          );
          expect(response.status).toBe(502);
          expect(error?.error).toBe('QUOTES_UNAVAILABLE');
        });

        it('includes quotes for a page of multiple cryptoassets', async () => {
          const accessToken = await createSession(
            'cryptoasset-quote-batch@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'batch-one',
              rank: 1,
              name: 'Batch One',
              ticker: 'B1',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'batch-two',
              rank: 2,
              name: 'Batch Two',
              ticker: 'B2',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET(
            '/cryptoassets',
            {
              params: { query: { quote: true } },
            },
          );
          expect(response.status).toBe(200);
          expect(data).toHaveLength(2);
          expect(marketData().getQuotes).toHaveBeenCalledTimes(1);
          const calledSlugs = marketData().getQuotes.mock.calls[0]?.[0]?.slugs;
          expect(calledSlugs).toEqual(
            expect.arrayContaining(['batch-one', 'batch-two']),
          );
          expect(data?.[0]?.quote).toMatchObject({ priceUsd: 100 });
          expect(data?.[1]?.quote).toMatchObject({ priceUsd: 100 });
        });
      });

      describe('security', () => {
        it('rejects cryptoasset creation without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/cryptoassets',
            {
              body: {} as never,
            },
          );
          expect(response.status).toBe(401);
        });

        it('rejects cryptoasset creation without a bearer token', async () => {
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'no-auth',
              rank: 1,
              name: 'No Auth',
              ticker: 'NOA',
              logoId: asset.id,
            }),
          });
          expect(response.status).toBe(401);
        });

        it('requires cryptoassets.manage to create a cryptoasset', async () => {
          const accessToken = await createSession(
            'cryptoasset-member@example.com',
          );
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'forbidden',
              rank: 1,
              name: 'Forbidden',
              ticker: 'FRB',
              logoId: asset.id,
            }),
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });

      describe('create', () => {
        it('creates a cryptoasset with tags and normalized logo', async () => {
          const accessToken = await createSession(
            'cryptoasset-create@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset('test/cryptoasset-create.png');
          const tag = await createTag('DeFi', 'defi');

          const { data, response } = await this.ctx.client.POST(
            '/cryptoassets',
            {
              body: cryptoassetBody({
                slug: 'bitcoin',
                rank: 1,
                name: 'Bitcoin',
                ticker: 'BTC',
                logoId: asset.id,
                status: 'published',
                tags: [tag.slug],
              }),
              headers,
            },
          );
          expect(response.status).toBe(201);
          expect(data?.slug).toBe('bitcoin');
          expect(data?.status).toBe('published');
          expect(data?.publishedAt).not.toBeNull();
          expect(data?.logo).toMatchObject({ id: asset.id });
          expect(data?.tags).toEqual([
            expect.objectContaining({ slug: 'defi' }),
          ]);
        });

        it('returns validation details for an unknown logo', async () => {
          const accessToken = await createSession(
            'cryptoasset-bad-logo@example.com',
            'cryptoassets_manager',
          );
          const { error, response } = await this.ctx.client.POST(
            '/cryptoassets',
            {
              body: cryptoassetBody({
                slug: 'bad-logo',
                rank: 1,
                name: 'Bad Logo',
                ticker: 'BLG',
                logoId: crypto.randomUUID(),
              }),
              headers: { authorization: `Bearer ${accessToken}` },
            },
          );
          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
          expect(
            (
              error as
                | {
                    details?: { fields?: Record<string, string[]> };
                  }
                | undefined
            )?.details?.fields?.logoId,
          ).toBeDefined();
        });

        it('returns validation details for an unknown tag', async () => {
          const accessToken = await createSession(
            'cryptoasset-bad-tag@example.com',
            'cryptoassets_manager',
          );
          const asset = await createAsset();
          const { error, response } = await this.ctx.client.POST(
            '/cryptoassets',
            {
              body: cryptoassetBody({
                slug: 'bad-tag',
                rank: 1,
                name: 'Bad Tag',
                ticker: 'BTG',
                logoId: asset.id,
                tags: ['missing-tag'],
              }),
              headers: { authorization: `Bearer ${accessToken}` },
            },
          );
          expect(response.status).toBe(422);
          expect(
            (
              error as
                | {
                    details?: { fields?: Record<string, string[]> };
                  }
                | undefined
            )?.details?.fields?.tags,
          ).toBeDefined();
        });

        it('rejects a duplicate slug', async () => {
          const accessToken = await createSession(
            'cryptoasset-slug@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const body = cryptoassetBody({
            slug: 'duplicate',
            rank: 1,
            name: 'Duplicate',
            ticker: 'DUP',
            logoId: asset.id,
          });
          await this.ctx.client.POST('/cryptoassets', { body, headers });
          const duplicate = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'duplicate',
              rank: 2,
              name: 'Other',
              ticker: 'OTH',
              logoId: asset.id,
            }),
            headers,
          });
          expect(duplicate.response.status).toBe(409);
          expect(duplicate.error?.error).toBe('SLUG_CONFLICT');
        });

        it('rejects a duplicate ticker', async () => {
          const accessToken = await createSession(
            'cryptoasset-ticker@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'first',
              rank: 1,
              name: 'First',
              ticker: 'SAME',
              logoId: asset.id,
            }),
            headers,
          });
          const duplicate = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'second',
              rank: 2,
              name: 'Second',
              ticker: 'SAME',
              logoId: asset.id,
            }),
            headers,
          });
          expect(duplicate.response.status).toBe(409);
          expect(duplicate.error?.error).toBe('TICKER_CONFLICT');
        });
      });

      describe('selectByIdentifier', () => {
        it('gets a cryptoasset by slug and by id, and hides drafts without permission', async () => {
          const accessToken = await createSession(
            'cryptoasset-detail@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'detail-coin',
              rank: 1,
              name: 'Detail Coin',
              ticker: 'DET',
              logoId: asset.id,
              status: 'draft',
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          const guest = await this.ctx.client.GET(
            '/cryptoassets/{identifier}',
            {
              params: { path: { identifier: 'detail-coin' } },
            },
          );
          expect(guest.response.status).toBe(404);

          const bySlug = await this.ctx.client.GET(
            '/cryptoassets/{identifier}',
            {
              params: { path: { identifier: 'detail-coin' } },
              headers,
            },
          );
          expect(bySlug.response.status).toBe(200);
          expect(bySlug.data?.id).toBe(created.data.id);
          expect(bySlug.data?.content).toBe('Content');

          const byId = await this.ctx.client.GET('/cryptoassets/{identifier}', {
            params: { path: { identifier: created.data.id } },
            headers,
          });
          expect(byId.response.status).toBe(200);
        });

        it('includes a quote on detail when requested', async () => {
          const accessToken = await createSession(
            'cryptoasset-detail-quote@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'quote-detail',
              rank: 1,
              name: 'Quote Detail',
              ticker: 'QTD',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          const quoted = await this.ctx.client.GET(
            '/cryptoassets/{identifier}',
            {
              params: {
                path: { identifier: 'quote-detail' },
                query: { quote: true },
              },
            },
          );
          expect(quoted.response.status).toBe(200);
          expect(quoted.data?.quote).toMatchObject({ priceUsd: 100 });
        });
      });

      describe('update/delete', () => {
        it('updates a cryptoasset, replaces tags, and keeps the original publishedAt', async () => {
          const accessToken = await createSession(
            'cryptoasset-update@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const oldTag = await createTag(
            'Old Cryptoasset Tag',
            'old-cryptoasset-tag',
          );
          const newTag = await createTag(
            'New Cryptoasset Tag',
            'new-cryptoasset-tag',
          );
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'update-coin',
              rank: 1,
              name: 'Update Coin',
              ticker: 'UPD',
              logoId: asset.id,
              status: 'published',
              tags: [oldTag.slug],
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          await this.ctx.client.PATCH('/cryptoassets/{id}', {
            params: { path: { id: created.data.id } },
            body: { status: 'draft' },
            headers,
          });
          const republished = await this.ctx.client.PATCH(
            '/cryptoassets/{id}',
            {
              params: { path: { id: created.data.id } },
              body: {
                name: 'Updated Coin',
                status: 'published',
                tags: [newTag.slug],
              },
              headers,
            },
          );
          expect(republished.response.status).toBe(200);
          expect(republished.data?.name).toBe('Updated Coin');
          expect(republished.data?.publishedAt).toBe(created.data.publishedAt);
          expect(republished.data?.tags).toEqual([
            expect.objectContaining({ slug: 'new-cryptoasset-tag' }),
          ]);
        });

        it('rejects an empty update body', async () => {
          const accessToken = await createSession(
            'cryptoasset-empty-update@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'empty-update',
              rank: 1,
              name: 'Empty Update',
              ticker: 'EMP',
              logoId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          const { error, response } = await this.ctx.client.PATCH(
            '/cryptoassets/{id}',
            {
              params: { path: { id: created.data.id } },
              body: {},
              headers,
            },
          );
          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
          expect(
            (error as { details?: { root?: string[] } } | undefined)?.details
              ?.root,
          ).toContain('Minimal satu field wajib diisi');
        });

        it('returns not found when updating a missing cryptoasset', async () => {
          const accessToken = await createSession(
            'cryptoasset-update-missing@example.com',
            'cryptoassets_manager',
          );
          const { response } = await this.ctx.client.PATCH(
            '/cryptoassets/{id}',
            {
              params: { path: { id: crypto.randomUUID() } },
              body: { name: 'Missing' },
              headers: { authorization: `Bearer ${accessToken}` },
            },
          );
          expect(response.status).toBe(404);
        });

        it('deletes a cryptoasset and returns not found afterwards', async () => {
          const accessToken = await createSession(
            'cryptoasset-delete@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'delete-coin',
              rank: 1,
              name: 'Delete Coin',
              ticker: 'DEL',
              logoId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          const deleted = await this.ctx.client.DELETE('/cryptoassets/{id}', {
            params: { path: { id: created.data.id } },
            headers,
          });
          expect(deleted.response.status).toBe(204);

          const missing = await this.ctx.client.GET(
            '/cryptoassets/{identifier}',
            {
              params: { path: { identifier: created.data.id } },
              headers,
            },
          );
          expect(missing.response.status).toBe(404);
        });

        it('rejects an invalid cryptoasset id format', async () => {
          const accessToken = await createSession(
            'cryptoasset-update-bad-id@example.com',
            'cryptoassets_manager',
          );
          const { response } = await this.ctx.client.PATCH(
            '/cryptoassets/{id}',
            {
              params: { path: { id: 'not-a-uuid' } },
              body: { name: 'Bad' },
              headers: { authorization: `Bearer ${accessToken}` },
            },
          );
          expect(response.status).toBe(422);
        });

        it('clears all tags when updating with an empty tag list', async () => {
          const accessToken = await createSession(
            'cryptoasset-clear-tags@example.com',
            'cryptoassets_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const tag = await createTag(
            'Clear Cryptoasset Tag',
            'clear-cryptoasset-tag',
          );
          const created = await this.ctx.client.POST('/cryptoassets', {
            body: cryptoassetBody({
              slug: 'clear-tags',
              rank: 1,
              name: 'Clear Tags',
              ticker: 'CLR',
              logoId: asset.id,
              tags: [tag.slug],
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create cryptoasset response has no data');

          const updated = await this.ctx.client.PATCH('/cryptoassets/{id}', {
            params: { path: { id: created.data.id } },
            body: { tags: [] },
            headers,
          });
          expect(updated.response.status).toBe(200);
          expect(updated.data?.tags).toEqual([]);
        });
      });
    });
  }
}
