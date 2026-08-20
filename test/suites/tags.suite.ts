import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import {
  assets,
  cryptoassetTags,
  cryptoassets,
  postTags,
  posts,
} from '#src/modules/drizzle/drizzle.schema';
import { Suite } from '#test/helpers/suite.base';
import { createSession as createSessionFor } from '#test/helpers/create-session';

export class TagsSuite extends Suite {
  register() {
    const db = () => this.ctx.app.get(DrizzleService).db;
    const createSession = (
      email: string,
      role: 'member' | 'posts_manager' = 'member',
    ) =>
      createSessionFor(this.ctx, email, role).then(
        ({ accessToken }) => accessToken,
      );

    describe('Tags', () => {
      describe('selectAll', () => {
        it('lists tags publicly with a total-items header', async () => {
          const { data, response } = await this.ctx.client.GET('/tags');
          expect(response.status).toBe(200);
          expect(data).toEqual([]);
          expect(response.headers.get('total-items')).toBe('0');
        });

        it('filters tags by slug and search term', async () => {
          const accessToken = await createSession(
            'tag-list@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          await this.ctx.client.POST('/tags', {
            body: { name: 'Halal Crypto', slug: 'halal-crypto' },
            headers,
          });
          await this.ctx.client.POST('/tags', {
            body: { name: 'DeFi', slug: 'defi' },
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/tags', {
            params: { query: { slugs: ['halal-crypto'], search: 'Halal' } },
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data).toHaveLength(1);
          expect(data?.[0]?.slug).toBe('halal-crypto');
        });

        it('filters by content sections and navigation flag', async () => {
          const accessToken = await createSession(
            'tag-nav@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          await this.ctx.client.POST('/tags', {
            body: {
              name: 'Crypto News',
              slug: 'crypto-news',
              contentSection: 'news',
              showInNavigation: true,
              displayOrder: 1,
            },
            headers,
          });
          await this.ctx.client.POST('/tags', {
            body: { name: 'Plain', slug: 'plain' },
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/tags', {
            params: {
              query: {
                contentSections: ['news'],
                showInNavigation: 'true',
              },
            },
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data?.[0]).toMatchObject({
            slug: 'crypto-news',
            contentSection: 'news',
            showInNavigation: true,
            displayOrder: 1,
          });
        });

        it('sorts tags by name and slug in both directions', async () => {
          const accessToken = await createSession(
            'tag-sort@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          await this.ctx.client.POST('/tags', {
            body: { name: 'Zeta', slug: 'zeta' },
            headers,
          });
          await this.ctx.client.POST('/tags', {
            body: { name: 'Alpha', slug: 'alpha' },
            headers,
          });
          await this.ctx.client.POST('/tags', {
            body: { name: 'Beta', slug: 'beta' },
            headers,
          });

          const ascending = await this.ctx.client.GET('/tags', {
            params: {
              query: { sortBy: 'name', sortDirection: 'asc' },
            },
          });
          expect(ascending.response.status).toBe(200);
          expect(ascending.data?.map((tag) => tag.slug)).toEqual([
            'alpha',
            'beta',
            'zeta',
          ]);

          const descending = await this.ctx.client.GET('/tags', {
            params: {
              query: { sortBy: 'name', sortDirection: 'desc' },
            },
          });
          expect(descending.response.status).toBe(200);
          expect(descending.data?.map((tag) => tag.slug)).toEqual([
            'zeta',
            'beta',
            'alpha',
          ]);
        });
      });

      describe('security', () => {
        it('rejects tag creation without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/tags',
            {
              body: { name: 'Halal', slug: 'halal' },
            },
          );
          expect(response.status).toBe(401);
        });

        it('rejects tag creation without a bearer token', async () => {
          const { response } = await this.ctx.client.POST('/tags', {
            body: { name: 'Halal', slug: 'halal' },
          });
          expect(response.status).toBe(401);
        });

        it('requires tags.manage to create a tag', async () => {
          const accessToken = await createSession('tag-member@example.com');
          const { response } = await this.ctx.client.POST('/tags', {
            body: { name: 'Halal', slug: 'halal' },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });

        it('requires tags.manage to update and delete a tag', async () => {
          const accessToken = await createSession(
            'tag-member-write@example.com',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const id = crypto.randomUUID();
          const updated = await this.ctx.client.PATCH('/tags/{id}', {
            params: { path: { id } },
            body: { name: 'Denied' },
            headers,
          });
          expect(updated.response.status).toBe(403);

          const deleted = await this.ctx.client.DELETE('/tags/{id}', {
            params: { path: { id }, query: { force: false } },
            headers,
          });
          expect(deleted.response.status).toBe(403);
        });
      });

      describe('create/update/delete', () => {
        it('creates, retrieves by slug, updates, and deletes a tag', async () => {
          const accessToken = await createSession(
            'tag-manager@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const created = await this.ctx.client.POST('/tags', {
            body: {
              name: 'Halal Crypto',
              slug: 'halal-crypto',
              description: 'Initial',
            },
            headers,
          });
          expect(created.response.status).toBe(201);
          expect(created.data?.createdBy).toMatchObject({
            email: 'tag-manager@example.com',
          });

          const found = await this.ctx.client.GET('/tags/{identifier}', {
            params: { path: { identifier: 'halal-crypto' } },
          });
          expect(found.response.status).toBe(200);
          expect(found.data?.id).toBe(created.data?.id);

          const foundById = await this.ctx.client.GET('/tags/{identifier}', {
            params: { path: { identifier: created.data!.id } },
          });
          expect(foundById.response.status).toBe(200);

          const updated = await this.ctx.client.PATCH('/tags/{id}', {
            params: { path: { id: created.data!.id } },
            body: { description: null },
            headers,
          });
          expect(updated.response.status).toBe(200);
          expect(updated.data?.description).toBeNull();

          const deleted = await this.ctx.client.DELETE('/tags/{id}', {
            params: { path: { id: created.data!.id }, query: { force: false } },
            headers,
          });
          expect(deleted.response.status).toBe(204);
        });

        it('creates a public content category and rejects one without a content section', async () => {
          const accessToken = await createSession(
            'tag-category@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };

          const created = await this.ctx.client.POST('/tags', {
            body: {
              name: 'Crypto News',
              slug: 'crypto-news',
              contentSection: 'news',
              showInNavigation: true,
              displayOrder: 1,
            },
            headers,
          });
          expect(created.response.status).toBe(201);
          expect(created.data).toMatchObject({
            contentSection: 'news',
            showInNavigation: true,
            displayOrder: 1,
          });

          const rejected = await this.ctx.client.POST('/tags', {
            body: {
              name: 'Invalid Category',
              slug: 'invalid-category',
              showInNavigation: true,
            },
            headers,
          });
          expect(rejected.response.status).toBe(422);
          expect(rejected.error?.error).toBe('VALIDATION_FAILED');
        });

        it('returns not found for an unknown tag', async () => {
          const accessToken = await createSession(
            'tag-not-found@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const id = crypto.randomUUID();
          const found = await this.ctx.client.GET('/tags/{identifier}', {
            params: { path: { identifier: id } },
          });
          expect(found.response.status).toBe(404);

          const updated = await this.ctx.client.PATCH('/tags/{id}', {
            params: { path: { id } },
            body: { name: 'Missing' },
            headers,
          });
          expect(updated.response.status).toBe(404);

          const deleted = await this.ctx.client.DELETE('/tags/{id}', {
            params: { path: { id }, query: { force: false } },
            headers,
          });
          expect(deleted.response.status).toBe(404);
        });

        it('rejects an update that conflicts with another tag', async () => {
          const accessToken = await createSession(
            'tag-update-conflict@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          await this.ctx.client.POST('/tags', {
            body: { name: 'Existing', slug: 'existing' },
            headers,
          });
          const created = await this.ctx.client.POST('/tags', {
            body: { name: 'Other', slug: 'other' },
            headers,
          });
          if (!created.data) throw new Error('Create tag response has no data');

          const updated = await this.ctx.client.PATCH('/tags/{id}', {
            params: { path: { id: created.data.id } },
            body: { slug: 'existing' },
            headers,
          });
          expect(updated.response.status).toBe(409);
          expect(updated.error?.error).toBe('SLUG_CONFLICT');
        });
      });

      describe('create', () => {
        it('returns validation details and rejects duplicate name or slug', async () => {
          const accessToken = await createSession(
            'tag-validation@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const invalid = await this.ctx.client.POST('/tags', {
            body: { name: '', slug: 'Bad Slug' },
            headers,
          });
          expect(invalid.response.status).toBe(422);
          expect(invalid.error?.error).toBe('VALIDATION_FAILED');
          expect(
            (
              invalid.error as
                { details?: { fields?: Record<string, string[]> } } | undefined
            )?.details?.fields?.name,
          ).toBeDefined();

          await this.ctx.client.POST('/tags', {
            body: { name: 'Unique', slug: 'unique' },
            headers,
          });
          const duplicate = await this.ctx.client.POST('/tags', {
            body: { name: 'Unique', slug: 'other' },
            headers,
          });
          expect(duplicate.response.status).toBe(409);
          expect(duplicate.error?.error).toBe('NAME_CONFLICT');
        });
      });

      describe('delete', () => {
        it('reports usage details and force deletes a referenced tag', async () => {
          const accessToken = await createSession(
            'tag-force@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const created = await this.ctx.client.POST('/tags', {
            body: { name: 'Referenced', slug: 'referenced' },
            headers,
          });
          if (!created.data) throw new Error('Create tag response has no data');
          const [asset] = await db()
            .insert(assets)
            .values({
              pathname: 'test/referenced.png',
              filename: 'referenced.png',
              size: 1,
              mimeType: 'image/png',
              width: null,
              height: null,
              provider: 'vercel_blob',
            })
            .returning();
          const [post] = await db()
            .insert(posts)
            .values({
              title: 'Referenced post',
              slug: 'referenced-post',
              excerpt: 'Excerpt',
              content: 'Content',
              coverImageId: asset.id,
              section: 'news',
              type: 'article',
              status: 'draft',
            })
            .returning();
          await db()
            .insert(postTags)
            .values({ postId: post.id, tagId: created.data.id });
          const [cryptoasset] = await db()
            .insert(cryptoassets)
            .values({
              slug: 'referenced-cryptoasset',
              rank: 1,
              name: 'Referenced Cryptoasset',
              ticker: 'REF',
              shariaStatus: 'halal',
              status: 'draft',
              excerpt: 'Excerpt',
              website: 'https://example.com',
              logoId: asset.id,
              content: 'Content',
            })
            .returning();
          await db()
            .insert(cryptoassetTags)
            .values({ cryptoassetId: cryptoasset.id, tagId: created.data.id });

          const blocked = await this.ctx.client.DELETE('/tags/{id}', {
            params: { path: { id: created.data.id }, query: { force: false } },
            headers,
          });
          expect(blocked.response.status).toBe(409);
          expect(blocked.error?.error).toBe('TAG_IN_USE');
          expect(
            (
              blocked.error as
                | {
                    details?: {
                      usage?: { posts: number; cryptoassets: number };
                    };
                  }
                | undefined
            )?.details?.usage,
          ).toEqual({ posts: 1, cryptoassets: 1 });

          const deleted = await this.ctx.client.DELETE('/tags/{id}', {
            params: { path: { id: created.data.id }, query: { force: true } },
            headers,
          });
          expect(deleted.response.status).toBe(204);
        });
      });
    });
  }
}
