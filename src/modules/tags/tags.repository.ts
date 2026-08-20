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
  or,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DatabaseError } from 'pg';
import { escapeLikePattern } from '#src/common/escape-like-pattern';
import { isUuid } from '#src/common/is-uuid';
import type { AuditMetadata } from '#src/modules/audit/audit.schemas';
import {
  cryptoassetTags,
  postTags,
  tags,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type { DbExecutor, Tag } from '#src/modules/drizzle/drizzle.types';
import type { TagsQuery } from './tags.schemas';
import { TagsError } from './tags.error';

type TagListInput = TagsQuery;
type TagFilterInput = Pick<TagsQuery, 'search' | 'slugs' | 'sections'>;

export type TagWithAudit = {
  tag: Tag;
  createdBy: AuditMetadata['createdBy'];
  updatedBy: AuditMetadata['updatedBy'];
};

const createdByUser = alias(users, 'tag_created_by');
const updatedByUser = alias(users, 'tag_updated_by');

@Injectable()
export class TagsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectWithAudit(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({
        tag: tags,
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
      .from(tags)
      .leftJoin(createdByUser, eq(tags.createdBy, createdByUser.id))
      .leftJoin(updatedByUser, eq(tags.updatedBy, updatedByUser.id));
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Tag['id'] | Tag['slug'],
  ): Promise<TagWithAudit> {
    const [result] = await this.selectWithAudit(this.drizzleService.db).where(
      isUuid(identifier) ? eq(tags.id, identifier) : eq(tags.slug, identifier),
    );
    if (!result) throw new TagsError('TAG_NOT_FOUND');
    return result;
  }

  async selectAll(input: TagListInput): Promise<TagWithAudit[]> {
    const filters: SQL[] = [];
    if (input.slugs?.length) filters.push(inArray(tags.slug, input.slugs));
    if (input.sections?.length)
      filters.push(inArray(tags.section, input.sections));
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(tags.name, pattern),
          ilike(tags.slug, pattern),
          ilike(tags.description, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const orderColumn = {
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
    }[input.sortBy];
    const order = input.sortDirection === 'desc' ? desc : asc;

    const rows = await this.selectWithAudit(this.drizzleService.db)
      .where(where)
      .orderBy(order(orderColumn), asc(tags.name))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    return rows;
  }

  async count(input: TagFilterInput): Promise<number> {
    const filters: SQL[] = [];
    if (input.slugs?.length) filters.push(inArray(tags.slug, input.slugs));
    if (input.sections?.length)
      filters.push(inArray(tags.section, input.sections));
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(tags.name, pattern),
          ilike(tags.slug, pattern),
          ilike(tags.description, pattern),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;
    const [result] = await this.drizzleService.db
      .select({ value: count() })
      .from(tags)
      .where(where);
    return result.value;
  }

  async selectByMixedIdentifiers(input: {
    ids: Tag['id'][];
    slugs: Tag['slug'][];
  }): Promise<Tag[]> {
    const filters: SQL[] = [];
    if (input.ids.length) filters.push(inArray(tags.id, input.ids));
    if (input.slugs.length) filters.push(inArray(tags.slug, input.slugs));
    if (!filters.length) return [];
    return this.drizzleService.db
      .select()
      .from(tags)
      .where(or(...filters));
  }

  async insert(
    data: Pick<
      Tag,
      'name' | 'slug' | 'description' | 'section' | 'createdBy' | 'updatedBy'
    >,
  ): Promise<Tag> {
    try {
      const [tag] = await this.drizzleService.db
        .insert(tags)
        .values(data)
        .returning();
      return tag;
    } catch (error) {
      this.mapUniqueError(error);
    }
  }

  async update(
    id: Tag['id'],
    data: Partial<
      Pick<Tag, 'name' | 'slug' | 'description' | 'section' | 'updatedBy'>
    >,
  ): Promise<Tag> {
    try {
      const [tag] = await this.drizzleService.db
        .update(tags)
        .set(data)
        .where(eq(tags.id, id))
        .returning();
      if (!tag) throw new TagsError('TAG_NOT_FOUND');
      return tag;
    } catch (error) {
      if (error instanceof TagsError) throw error;
      this.mapUniqueError(error);
    }
  }

  async delete(id: Tag['id'], force: boolean): Promise<Tag> {
    return this.drizzleService.db.transaction(async (tx) => {
      const [[postUsage], [cryptoassetUsage]] = await Promise.all([
        tx
          .select({ value: count() })
          .from(postTags)
          .where(eq(postTags.tagId, id)),
        tx
          .select({ value: count() })
          .from(cryptoassetTags)
          .where(eq(cryptoassetTags.tagId, id)),
      ]);
      const usage = {
        posts: postUsage.value,
        cryptoassets: cryptoassetUsage.value,
      };
      if (!force && (usage.posts || usage.cryptoassets)) {
        throw new TagsError('TAG_IN_USE', { usage });
      }
      const [tag] = await tx.delete(tags).where(eq(tags.id, id)).returning();
      if (!tag) throw new TagsError('TAG_NOT_FOUND');
      return tag;
    });
  }

  private mapUniqueError(error: unknown): never {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof DatabaseError &&
      error.cause.code === '23505'
    ) {
      if (error.cause.constraint === 'tags_name_unique') {
        throw new TagsError('NAME_CONFLICT');
      }
      if (error.cause.constraint === 'tags_slug_unique') {
        throw new TagsError('SLUG_CONFLICT');
      }
    }
    throw error;
  }
}
