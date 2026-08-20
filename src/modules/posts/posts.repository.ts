import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  DrizzleQueryError,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DatabaseError } from 'pg';
import { isUuid } from '#src/common/is-uuid';
import { escapeLikePattern } from '#src/common/escape-like-pattern';
import { createValidationError } from '#src/common/create-validation-error';
import type { AuditMetadata } from '#src/modules/audit/audit.schemas';
import {
  assets,
  postTags,
  posts,
  tags,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type {
  Asset,
  DbExecutor,
  Post,
  Tag,
} from '#src/modules/drizzle/drizzle.types';
import type { PostsQuery } from './posts.schemas';
import { PostsError } from './posts.error';

export type PostWithRelation = {
  post: Post;
  coverImage: Asset | null;
  tags: Tag[];
  createdBy: AuditMetadata['createdBy'];
  updatedBy: AuditMetadata['updatedBy'];
};

const createdByUser = alias(users, 'post_created_by');
const updatedByUser = alias(users, 'post_updated_by');

@Injectable()
export class PostsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectBase(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({
        post: posts,
        coverImage: assets,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(posts)
      .leftJoin(assets, eq(posts.coverImageId, assets.id))
      .leftJoin(createdByUser, eq(posts.createdBy, createdByUser.id))
      .leftJoin(updatedByUser, eq(posts.updatedBy, updatedByUser.id));
  }

  private buildFilters(input: PostsQuery): SQL | undefined {
    const filters: SQL[] = [];
    if (input.statuses?.length)
      filters.push(inArray(posts.status, input.statuses));
    if (input.sections?.length)
      filters.push(inArray(posts.section, input.sections));
    if (input.types?.length) filters.push(inArray(posts.type, input.types));
    if (input.slugs?.length) filters.push(inArray(posts.slug, input.slugs));
    if (input.exclude?.length)
      filters.push(notInArray(posts.slug, input.exclude));
    if (input.tags?.length) {
      const matchingPostIds = this.drizzleService.db
        .select({ postId: postTags.postId })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(inArray(tags.slug, input.tags));
      filters.push(inArray(posts.id, matchingPostIds));
    }
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(posts.title, pattern),
          ilike(posts.slug, pattern),
          ilike(posts.excerpt, pattern),
          ilike(posts.content, pattern),
        )!,
      );
    }
    return filters.length ? and(...filters) : undefined;
  }

  private async withRelations(
    rows: Array<Omit<PostWithRelation, 'tags'>>,
  ): Promise<PostWithRelation[]> {
    if (!rows.length) return rows as PostWithRelation[];
    const ids = rows.map((row) => row.post.id);
    const tagRows = await this.drizzleService.db
      .select({ postId: postTags.postId, tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, ids))
      .orderBy(asc(tags.name));
    const byPost = new Map<Post['id'], Tag[]>();
    for (const row of tagRows) {
      const list = byPost.get(row.postId) ?? [];
      list.push(row.tag);
      byPost.set(row.postId, list);
    }
    return rows.map((row) => ({
      ...row,
      coverImage: row.coverImage?.id ? row.coverImage : null,
      tags: byPost.get(row.post.id) ?? [],
    }));
  }

  private async replaceTags(
    tx: DbExecutor,
    postId: Post['id'],
    tagIds: Tag['id'][],
  ): Promise<void> {
    await tx.delete(postTags).where(eq(postTags.postId, postId));
    if (tagIds.length) {
      await tx
        .insert(postTags)
        .values(tagIds.map((tagId) => ({ postId, tagId })));
    }
  }

  private buildOrderBy(input: Pick<PostsQuery, 'sortBy' | 'sortDirection'>) {
    const { sortBy, sortDirection } = input;
    const order = sortDirection === 'asc' ? asc : desc;
    const tieBreaker = desc(posts.createdAt);

    switch (sortBy) {
      case 'publishedAtOrCreatedAt':
        return [order(sql`COALESCE(${posts.publishedAt}, ${posts.createdAt})`)];
      case 'publishedAt':
        return [
          sortDirection === 'asc'
            ? sql`${posts.publishedAt} ASC NULLS LAST`
            : sql`${posts.publishedAt} DESC NULLS LAST`,
          tieBreaker,
        ];
      case 'tags': {
        const firstTagName = sql<string>`COALESCE((SELECT MIN(${tags.name}) FROM ${postTags} INNER JOIN ${tags} ON ${postTags.tagId} = ${tags.id} WHERE ${postTags.postId} = ${posts.id}), '')`;
        return [order(firstTagName), tieBreaker];
      }
      case 'title':
        return [order(posts.title), tieBreaker];
      case 'status':
        return [order(posts.status), tieBreaker];
      case 'section':
        return [order(posts.section), tieBreaker];
      case 'createdAt':
        return [order(posts.createdAt), tieBreaker];
    }
  }

  async selectAll(input: PostsQuery): Promise<PostWithRelation[]> {
    const where = this.buildFilters(input);
    const rows = await this.selectBase(this.drizzleService.db)
      .where(where)
      .orderBy(...this.buildOrderBy(input))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    return this.withRelations(rows);
  }

  async count(input: PostsQuery): Promise<number> {
    const where = this.buildFilters(input);
    const [result] = await this.drizzleService.db
      .select({ value: count() })
      .from(posts)
      .where(where);
    return result.value;
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Post['id'] | Post['slug'],
  ): Promise<PostWithRelation> {
    const [row] = await this.selectBase(this.drizzleService.db).where(
      isUuid(identifier)
        ? eq(posts.id, identifier)
        : eq(posts.slug, identifier),
    );
    if (!row) throw new PostsError('POST_NOT_FOUND');
    const [withTags] = await this.withRelations([row]);
    return withTags;
  }

  async insert(
    data: Pick<
      Post,
      | 'title'
      | 'slug'
      | 'excerpt'
      | 'content'
      | 'coverImageId'
      | 'section'
      | 'type'
      | 'status'
      | 'isFeatured'
      | 'eventDate'
      | 'externalLink'
      | 'publishedAt'
      | 'createdBy'
      | 'updatedBy'
    > & { tagIds: Tag['id'][] },
  ): Promise<Post> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...postData } = data;
        const [post] = await tx.insert(posts).values(postData).returning();
        if (tagIds.length) await this.replaceTags(tx, post.id, tagIds);
        return post;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }
  async update(
    id: Post['id'],
    data: Partial<
      Pick<
        Post,
        | 'title'
        | 'slug'
        | 'excerpt'
        | 'content'
        | 'coverImageId'
        | 'section'
        | 'type'
        | 'status'
        | 'isFeatured'
        | 'eventDate'
        | 'externalLink'
        | 'updatedBy'
      >
    > & { tagIds?: Tag['id'][] },
  ): Promise<Post> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...postData } = data;
        const setData =
          postData.status === 'published'
            ? {
                ...postData,
                publishedAt: sql`COALESCE(${posts.publishedAt}, now())`,
              }
            : postData;
        const [post] = await tx
          .update(posts)
          .set(setData)
          .where(eq(posts.id, id))
          .returning();
        if (!post) throw new PostsError('POST_NOT_FOUND');
        if (tagIds !== undefined) await this.replaceTags(tx, id, tagIds);
        return post;
      });
    } catch (error) {
      if (error instanceof PostsError) throw error;
      this.mapWriteError(error);
    }
  }

  async delete(id: Post['id']): Promise<Post> {
    const [post] = await this.drizzleService.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();
    if (!post) throw new PostsError('POST_NOT_FOUND');
    return post;
  }

  private mapWriteError(error: unknown): never {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof DatabaseError
    ) {
      if (
        error.cause.code === '23503' &&
        error.cause.constraint?.includes('cover_image_id')
      ) {
        throw createValidationError({
          fields: { coverImageId: ['Tidak ditemukan'] },
        });
      }
      if (error.cause.code === '23505') {
        throw new PostsError('SLUG_CONFLICT');
      }
    }
    throw error;
  }
}
