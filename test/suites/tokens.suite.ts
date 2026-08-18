import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { MarketDataError } from '#src/modules/market-data/market-data.error';
import { assets, tags } from '#src/modules/drizzle/drizzle.schema';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';
import type { TestMarketDataService } from '#test/helpers/test-market-data.service';

function getToken(html: string) {
  const match = html.match(/verify\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a verification token');
  return match[1];
}

export class TokensSuite extends Suite {
  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const users = () => this.ctx.app.get(UsersService);
    const db = () => this.ctx.app.get(DrizzleService).db;
    const marketData = () =>
      this.ctx.app.get<TestMarketDataService>(MarketDataService);
    const createSession = async (
      email: string,
      role: 'member' | 'tokens_manager' = 'member',
    ) => {
      const password = 'secure-password';
      await this.ctx.client.POST('/auth/signup', {
        body: {
          name: 'Token User',
          email,
          password,
          redirectUrl: 'https://app.cryptosharia.id/verify/{token}',
        },
      });
      await this.ctx.client.POST('/auth/verify', {
        body: { token: getToken(mailer().messages.at(-1)!.html) },
      });
      const user = await users().selectByEmail(email);
      if (role !== 'member') await users().update(user.id, { role });
      const signin = await this.ctx.client.POST('/auth/signin', {
        body: { email, password },
      });
      if (!signin.data) throw new Error('Signin response has no token pair');
      return signin.data.accessToken;
    };
    const createAsset = async (pathname = 'test/token-logo.png') => {
      const [asset] = await db()
        .insert(assets)
        .values({
          pathname,
          filename: 'token-logo.png',
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
    const tokenBody = (input: {
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

    describe('Tokens', () => {
      describe('selectAll', () => {
        it('returns only published tokens to a guest with a total-items header', async () => {
          const accessToken = await createSession(
            'token-list@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'draft-token',
              rank: 1,
              name: 'Draft Token',
              ticker: 'DRFT',
              logoId: asset.id,
              status: 'draft',
            }),
            headers,
          });
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'published-token',
              rank: 2,
              name: 'Published Token',
              ticker: 'PUB',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/tokens');
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data).toHaveLength(1);
          expect(data?.[0]?.slug).toBe('published-token');
          expect(data?.[0]).not.toHaveProperty('content');
        });

        it('filters by sharia status and search', async () => {
          const accessToken = await createSession(
            'token-filter@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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

          const { data, response } = await this.ctx.client.GET('/tokens', {
            params: { query: { shariaStatuses: ['haram'], search: 'Haram' } },
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data?.[0]?.slug).toBe('haram-coin');
        });

        it('rejects explicit non-published status filters without tokens.manage', async () => {
          const accessToken = await createSession('token-guest@example.com');
          const { response } = await this.ctx.client.GET('/tokens', {
            params: { query: { statuses: ['draft'] } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });

        it('omits quotes by default and includes them when quote=true', async () => {
          const accessToken = await createSession(
            'token-quote@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'quote-coin',
              rank: 1,
              name: 'Quote Coin',
              ticker: 'QTC',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const plain = await this.ctx.client.GET('/tokens');
          expect(plain.response.status).toBe(200);
          expect(plain.data?.[0]).not.toHaveProperty('quote');

          const quoted = await this.ctx.client.GET('/tokens', {
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
            'token-quote-fail@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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

          const { error, response } = await this.ctx.client.GET('/tokens', {
            params: { query: { quote: true } },
          });
          expect(response.status).toBe(502);
          expect(error?.error).toBe('QUOTES_UNAVAILABLE');
        });

        it('includes quotes for a page of multiple tokens', async () => {
          const accessToken = await createSession(
            'token-quote-batch@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'batch-one',
              rank: 1,
              name: 'Batch One',
              ticker: 'B1',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'batch-two',
              rank: 2,
              name: 'Batch Two',
              ticker: 'B2',
              logoId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/tokens', {
            params: { query: { quote: true } },
          });
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
        it('rejects token creation without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/tokens',
            {
              body: {} as never,
            },
          );
          expect(response.status).toBe(401);
        });

        it('rejects token creation without a bearer token', async () => {
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'no-auth',
              rank: 1,
              name: 'No Auth',
              ticker: 'NOA',
              logoId: asset.id,
            }),
          });
          expect(response.status).toBe(401);
        });

        it('requires tokens.manage to create a token', async () => {
          const accessToken = await createSession('token-member@example.com');
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
        it('creates a token with tags and normalized logo', async () => {
          const accessToken = await createSession(
            'token-create@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset('test/token-create.png');
          const tag = await createTag('DeFi', 'defi');

          const { data, response } = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'bitcoin',
              rank: 1,
              name: 'Bitcoin',
              ticker: 'BTC',
              logoId: asset.id,
              status: 'published',
              tags: [tag.slug],
            }),
            headers,
          });
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
            'token-bad-logo@example.com',
            'tokens_manager',
          );
          const { error, response } = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'bad-logo',
              rank: 1,
              name: 'Bad Logo',
              ticker: 'BLG',
              logoId: crypto.randomUUID(),
            }),
            headers: { authorization: `Bearer ${accessToken}` },
          });
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
            'token-bad-tag@example.com',
            'tokens_manager',
          );
          const asset = await createAsset();
          const { error, response } = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'bad-tag',
              rank: 1,
              name: 'Bad Tag',
              ticker: 'BTG',
              logoId: asset.id,
              tags: ['missing-tag'],
            }),
            headers: { authorization: `Bearer ${accessToken}` },
          });
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
            'token-slug@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const body = tokenBody({
            slug: 'duplicate',
            rank: 1,
            name: 'Duplicate',
            ticker: 'DUP',
            logoId: asset.id,
          });
          await this.ctx.client.POST('/tokens', { body, headers });
          const duplicate = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
            'token-ticker@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'first',
              rank: 1,
              name: 'First',
              ticker: 'SAME',
              logoId: asset.id,
            }),
            headers,
          });
          const duplicate = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
        it('gets a token by slug and by id, and hides drafts without permission', async () => {
          const accessToken = await createSession(
            'token-detail@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
            throw new Error('Create token response has no data');

          const guest = await this.ctx.client.GET('/tokens/{identifier}', {
            params: { path: { identifier: 'detail-coin' } },
          });
          expect(guest.response.status).toBe(404);

          const bySlug = await this.ctx.client.GET('/tokens/{identifier}', {
            params: { path: { identifier: 'detail-coin' } },
            headers,
          });
          expect(bySlug.response.status).toBe(200);
          expect(bySlug.data?.id).toBe(created.data.id);
          expect(bySlug.data?.content).toBe('Content');

          const byId = await this.ctx.client.GET('/tokens/{identifier}', {
            params: { path: { identifier: created.data.id } },
            headers,
          });
          expect(byId.response.status).toBe(200);
        });

        it('includes a quote on detail when requested', async () => {
          const accessToken = await createSession(
            'token-detail-quote@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
            throw new Error('Create token response has no data');

          const quoted = await this.ctx.client.GET('/tokens/{identifier}', {
            params: {
              path: { identifier: 'quote-detail' },
              query: { quote: true },
            },
          });
          expect(quoted.response.status).toBe(200);
          expect(quoted.data?.quote).toMatchObject({ priceUsd: 100 });
        });
      });

      describe('update/delete', () => {
        it('updates a token, replaces tags, and keeps the original publishedAt', async () => {
          const accessToken = await createSession(
            'token-update@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const oldTag = await createTag('Old Token Tag', 'old-token-tag');
          const newTag = await createTag('New Token Tag', 'new-token-tag');
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
            throw new Error('Create token response has no data');

          await this.ctx.client.PATCH('/tokens/{id}', {
            params: { path: { id: created.data.id } },
            body: { status: 'draft' },
            headers,
          });
          const republished = await this.ctx.client.PATCH('/tokens/{id}', {
            params: { path: { id: created.data.id } },
            body: {
              name: 'Updated Coin',
              status: 'published',
              tags: [newTag.slug],
            },
            headers,
          });
          expect(republished.response.status).toBe(200);
          expect(republished.data?.name).toBe('Updated Coin');
          expect(republished.data?.publishedAt).toBe(created.data.publishedAt);
          expect(republished.data?.tags).toEqual([
            expect.objectContaining({ slug: 'new-token-tag' }),
          ]);
        });

        it('rejects an empty update body', async () => {
          const accessToken = await createSession(
            'token-empty-update@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'empty-update',
              rank: 1,
              name: 'Empty Update',
              ticker: 'EMP',
              logoId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create token response has no data');

          const { error, response } = await this.ctx.client.PATCH(
            '/tokens/{id}',
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

        it('returns not found when updating a missing token', async () => {
          const accessToken = await createSession(
            'token-update-missing@example.com',
            'tokens_manager',
          );
          const { response } = await this.ctx.client.PATCH('/tokens/{id}', {
            params: { path: { id: crypto.randomUUID() } },
            body: { name: 'Missing' },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(404);
        });

        it('deletes a token and returns not found afterwards', async () => {
          const accessToken = await createSession(
            'token-delete@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
              slug: 'delete-coin',
              rank: 1,
              name: 'Delete Coin',
              ticker: 'DEL',
              logoId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create token response has no data');

          const deleted = await this.ctx.client.DELETE('/tokens/{id}', {
            params: { path: { id: created.data.id } },
            headers,
          });
          expect(deleted.response.status).toBe(204);

          const missing = await this.ctx.client.GET('/tokens/{identifier}', {
            params: { path: { identifier: created.data.id } },
            headers,
          });
          expect(missing.response.status).toBe(404);
        });

        it('rejects an invalid token id format', async () => {
          const accessToken = await createSession(
            'token-update-bad-id@example.com',
            'tokens_manager',
          );
          const { response } = await this.ctx.client.PATCH('/tokens/{id}', {
            params: { path: { id: 'not-a-uuid' } },
            body: { name: 'Bad' },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(422);
        });

        it('clears all tags when updating with an empty tag list', async () => {
          const accessToken = await createSession(
            'token-clear-tags@example.com',
            'tokens_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const tag = await createTag('Clear Token Tag', 'clear-token-tag');
          const created = await this.ctx.client.POST('/tokens', {
            body: tokenBody({
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
            throw new Error('Create token response has no data');

          const updated = await this.ctx.client.PATCH('/tokens/{id}', {
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
