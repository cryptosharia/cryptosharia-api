import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { assets, tags } from '#src/modules/drizzle/drizzle.schema';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';

function getToken(html: string) {
  const match = html.match(/verify\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a verification token');
  return match[1];
}

export class PostsSuite extends Suite {
  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const users = () => this.ctx.app.get(UsersService);
    const db = () => this.ctx.app.get(DrizzleService).db;
    const createSession = async (
      email: string,
      role: 'member' | 'posts_manager' = 'member',
    ) => {
      const password = 'secure-password';
      await this.ctx.client.POST('/auth/signup', {
        body: {
          name: 'Post User',
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
    const createAsset = async (pathname = 'test/post-cover.png') => {
      const [asset] = await db()
        .insert(assets)
        .values({
          pathname,
          filename: 'post-cover.png',
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
    const postBody = (input: {
      title: string;
      slug: string;
      coverImageId: string;
      content?: string;
      section?: 'news' | 'education' | 'research' | 'activity';
      type?: 'article' | 'webinar' | 'video' | 'headline';
      status?: 'draft' | 'published' | 'archived';
      tags?: string[];
      eventDate?: string | null;
      externalLink?: string | null;
    }) => ({
      title: input.title,
      slug: input.slug,
      excerpt: 'Excerpt',
      content: input.content ?? 'Content',
      coverImageId: input.coverImageId,
      section: input.section ?? 'news',
      type: input.type ?? 'article',
      status: input.status ?? 'draft',
      isFeatured: false,
      eventDate: input.eventDate ?? null,
      externalLink: input.externalLink ?? null,
      tags: input.tags ?? [],
    });

    describe('Posts', () => {
      describe('selectAll', () => {
        it('returns only published posts to a guest with a total-items header', async () => {
          const accessToken = await createSession(
            'post-list@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Draft Post',
              slug: 'draft-post',
              coverImageId: asset.id,
              status: 'draft',
            }),
            headers,
          });
          await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Published Post',
              slug: 'published-post',
              coverImageId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/posts');
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data).toHaveLength(1);
          expect(data?.[0]?.slug).toBe('published-post');
          expect(data?.[0]).not.toHaveProperty('content');
        });

        it('filters by sections, search, and excludes content', async () => {
          const accessToken = await createSession(
            'post-filter@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Education Topic',
              slug: 'education-topic',
              coverImageId: asset.id,
              section: 'education',
              status: 'published',
            }),
            headers,
          });
          await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'News Topic',
              slug: 'news-topic',
              coverImageId: asset.id,
              status: 'published',
            }),
            headers,
          });

          const { data, response } = await this.ctx.client.GET('/posts', {
            params: { query: { sections: ['education'], search: 'Education' } },
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data?.[0]?.slug).toBe('education-topic');
        });

        it('rejects explicit non-published status filters without posts.manage', async () => {
          const accessToken = await createSession('post-guest@example.com');
          const { response } = await this.ctx.client.GET('/posts', {
            params: { query: { statuses: ['draft'] } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });

      describe('security', () => {
        it('rejects post creation without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/posts',
            {
              body: {} as never,
            },
          );
          expect(response.status).toBe(401);
        });

        it('rejects post creation without a bearer token', async () => {
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'No Auth',
              slug: 'no-auth',
              coverImageId: asset.id,
            }),
          });
          expect(response.status).toBe(401);
        });

        it('requires posts.manage to create a post', async () => {
          const accessToken = await createSession('post-member@example.com');
          const asset = await createAsset();
          const { response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Forbidden',
              slug: 'forbidden',
              coverImageId: asset.id,
            }),
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });

      describe('create', () => {
        it('creates a post with tags and normalized cover image', async () => {
          const accessToken = await createSession(
            'post-create@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset('test/post-create.png');
          const tag = await createTag('Education', 'education');

          const { data, response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Halal Investing',
              slug: 'halal-investing',
              coverImageId: asset.id,
              section: 'education',
              status: 'published',
              tags: [tag.slug],
            }),
            headers,
          });
          expect(response.status).toBe(201);
          expect(data?.slug).toBe('halal-investing');
          expect(data?.status).toBe('published');
          expect(data?.publishedAt).not.toBeNull();
          expect(data?.coverImage).toMatchObject({ id: asset.id });
          expect(data?.tags).toEqual([
            expect.objectContaining({ slug: 'education' }),
          ]);
          expect(data?.createdBy).toMatchObject({
            email: 'post-create@example.com',
          });
        });

        it('returns validation details for an unknown cover image', async () => {
          const accessToken = await createSession(
            'post-bad-cover@example.com',
            'posts_manager',
          );
          const { error, response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Bad Cover',
              slug: 'bad-cover',
              coverImageId: crypto.randomUUID(),
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
            )?.details?.fields?.coverImageId,
          ).toBeDefined();
        });

        it('returns validation details for an unknown tag', async () => {
          const accessToken = await createSession(
            'post-bad-tag@example.com',
            'posts_manager',
          );
          const asset = await createAsset();
          const { error, response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Bad Tag',
              slug: 'bad-tag',
              coverImageId: asset.id,
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

        it('returns validation details for an invalid event date', async () => {
          const accessToken = await createSession(
            'post-bad-date@example.com',
            'posts_manager',
          );
          const asset = await createAsset();
          const { error, response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Bad Date',
              slug: 'bad-date',
              coverImageId: asset.id,
              eventDate: 'bukan-tanggal',
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
            )?.details?.fields?.eventDate,
          ).toBeDefined();
        });

        it('returns validation details for an invalid external link', async () => {
          const accessToken = await createSession(
            'post-bad-link@example.com',
            'posts_manager',
          );
          const asset = await createAsset();
          const { error, response } = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Bad Link',
              slug: 'bad-link',
              coverImageId: asset.id,
              externalLink: 'not-a-url',
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
            )?.details?.fields?.externalLink,
          ).toBeDefined();
        });

        it('rejects a duplicate slug', async () => {
          const accessToken = await createSession(
            'post-slug@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const body = postBody({
            title: 'Duplicate',
            slug: 'duplicate-post',
            coverImageId: asset.id,
          });
          await this.ctx.client.POST('/posts', { body, headers });
          const duplicate = await this.ctx.client.POST('/posts', {
            body,
            headers,
          });
          expect(duplicate.response.status).toBe(409);
          expect(duplicate.error?.error).toBe('SLUG_CONFLICT');
        });
      });

      describe('selectByIdentifier', () => {
        it('gets a post by slug and by id, and hides drafts without permission', async () => {
          const accessToken = await createSession(
            'post-detail@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Detail Post',
              slug: 'detail-post',
              coverImageId: asset.id,
              content: 'Full content',
              status: 'draft',
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          const guest = await this.ctx.client.GET('/posts/{identifier}', {
            params: { path: { identifier: 'detail-post' } },
          });
          expect(guest.response.status).toBe(404);

          const bySlug = await this.ctx.client.GET('/posts/{identifier}', {
            params: { path: { identifier: 'detail-post' } },
            headers,
          });
          expect(bySlug.response.status).toBe(200);
          expect(bySlug.data?.id).toBe(created.data.id);
          expect(bySlug.data?.content).toBe('Full content');

          const byId = await this.ctx.client.GET('/posts/{identifier}', {
            params: { path: { identifier: created.data.id } },
            headers,
          });
          expect(byId.response.status).toBe(200);
        });

        it('returns not found for an unknown identifier', async () => {
          const { response } = await this.ctx.client.GET(
            '/posts/{identifier}',
            {
              params: { path: { identifier: crypto.randomUUID() } },
            },
          );
          expect(response.status).toBe(404);
        });
      });

      describe('update/delete', () => {
        it('updates a post, replaces tags, and keeps the original publishedAt', async () => {
          const accessToken = await createSession(
            'post-update@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const oldTag = await createTag('Old Tag', 'old-tag');
          const newTag = await createTag('New Tag', 'new-tag');
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Update Post',
              slug: 'update-post',
              coverImageId: asset.id,
              status: 'published',
              tags: [oldTag.slug],
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          await this.ctx.client.PATCH('/posts/{id}', {
            params: { path: { id: created.data.id } },
            body: { status: 'draft' },
            headers,
          });
          const republished = await this.ctx.client.PATCH('/posts/{id}', {
            params: { path: { id: created.data.id } },
            body: {
              title: 'Updated Post',
              status: 'published',
              tags: [newTag.slug],
            },
            headers,
          });
          expect(republished.response.status).toBe(200);
          expect(republished.data?.title).toBe('Updated Post');
          expect(republished.data?.publishedAt).toBe(created.data.publishedAt);
          expect(republished.data?.tags).toEqual([
            expect.objectContaining({ slug: 'new-tag' }),
          ]);
        });

        it('rejects an update that conflicts with another post slug', async () => {
          const accessToken = await createSession(
            'post-update-conflict@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Existing',
              slug: 'existing-post',
              coverImageId: asset.id,
            }),
            headers,
          });
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Other',
              slug: 'other-post',
              coverImageId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          const updated = await this.ctx.client.PATCH('/posts/{id}', {
            params: { path: { id: created.data.id } },
            body: { slug: 'existing-post' },
            headers,
          });
          expect(updated.response.status).toBe(409);
        });

        it('deletes a post and returns not found afterwards', async () => {
          const accessToken = await createSession(
            'post-delete@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Delete Post',
              slug: 'delete-post',
              coverImageId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          const deleted = await this.ctx.client.DELETE('/posts/{id}', {
            params: { path: { id: created.data.id } },
            headers,
          });
          expect(deleted.response.status).toBe(204);

          const missing = await this.ctx.client.GET('/posts/{identifier}', {
            params: { path: { identifier: created.data.id } },
            headers,
          });
          expect(missing.response.status).toBe(404);
        });

        it('rejects an empty update body', async () => {
          const accessToken = await createSession(
            'post-empty-update@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Empty Update',
              slug: 'empty-update',
              coverImageId: asset.id,
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          const { error, response } = await this.ctx.client.PATCH(
            '/posts/{id}',
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

        it('returns not found when updating a missing post', async () => {
          const accessToken = await createSession(
            'post-update-missing@example.com',
            'posts_manager',
          );
          const { response } = await this.ctx.client.PATCH('/posts/{id}', {
            params: { path: { id: crypto.randomUUID() } },
            body: { title: 'Missing' },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(404);
        });

        it('rejects an invalid post id format', async () => {
          const accessToken = await createSession(
            'post-update-bad-id@example.com',
            'posts_manager',
          );
          const { response } = await this.ctx.client.PATCH('/posts/{id}', {
            params: { path: { id: 'not-a-uuid' } },
            body: { title: 'Bad' },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(422);
        });

        it('clears all tags when updating with an empty tag list', async () => {
          const accessToken = await createSession(
            'post-clear-tags@example.com',
            'posts_manager',
          );
          const headers = { authorization: `Bearer ${accessToken}` };
          const asset = await createAsset();
          const tag = await createTag('Clear Me', 'clear-me');
          const created = await this.ctx.client.POST('/posts', {
            body: postBody({
              title: 'Clear Tags',
              slug: 'clear-tags',
              coverImageId: asset.id,
              tags: [tag.slug],
            }),
            headers,
          });
          if (!created.data)
            throw new Error('Create post response has no data');

          const updated = await this.ctx.client.PATCH('/posts/{id}', {
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
