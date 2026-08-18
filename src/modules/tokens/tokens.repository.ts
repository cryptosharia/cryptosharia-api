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
  tags,
  tokenTags,
  tokens,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type {
  Asset,
  DbExecutor,
  Tag,
  Token,
} from '#src/modules/drizzle/drizzle.types';
import { TokensError } from './tokens.error';

export type TokenWithRelation = {
  token: Token;
  logo: Asset | null;
  tags: Tag[];
  createdBy: AuditMetadata['createdBy'];
  updatedBy: AuditMetadata['updatedBy'];
};

const createdByUser = alias(users, 'token_created_by');
const updatedByUser = alias(users, 'token_updated_by');

type TokenListInput = {
  page: number;
  limit: number;
  search?: string;
  statuses?: Token['status'][];
  shariaStatuses?: Token['shariaStatus'][];
  slugs?: string[];
  exclude?: string[];
  tags?: string[];
};

@Injectable()
export class TokensRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectBase(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({
        token: tokens,
        logo: assets,
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
      .from(tokens)
      .leftJoin(assets, eq(tokens.logoId, assets.id))
      .leftJoin(createdByUser, eq(tokens.createdBy, createdByUser.id))
      .leftJoin(updatedByUser, eq(tokens.updatedBy, updatedByUser.id));
  }

  private buildFilters(input: TokenListInput): SQL | undefined {
    const filters: SQL[] = [];
    if (input.statuses?.length)
      filters.push(inArray(tokens.status, input.statuses));
    if (input.shariaStatuses?.length)
      filters.push(inArray(tokens.shariaStatus, input.shariaStatuses));
    if (input.slugs?.length) filters.push(inArray(tokens.slug, input.slugs));
    if (input.exclude?.length)
      filters.push(notInArray(tokens.slug, input.exclude));
    if (input.tags?.length) {
      const matchingTokenIds = this.drizzleService.db
        .select({ tokenId: tokenTags.tokenId })
        .from(tokenTags)
        .innerJoin(tags, eq(tokenTags.tagId, tags.id))
        .where(inArray(tags.slug, input.tags));
      filters.push(inArray(tokens.id, matchingTokenIds));
    }
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(tokens.name, pattern),
          ilike(tokens.ticker, pattern),
          ilike(tokens.slug, pattern),
          ilike(tokens.excerpt, pattern),
          ilike(tokens.content, pattern),
        )!,
      );
    }
    return filters.length ? and(...filters) : undefined;
  }

  private async withRelations(
    rows: Array<Omit<TokenWithRelation, 'tags'>>,
  ): Promise<TokenWithRelation[]> {
    if (!rows.length) return rows as TokenWithRelation[];
    const ids = rows.map((row) => row.token.id);
    const tagRows = await this.drizzleService.db
      .select({ tokenId: tokenTags.tokenId, tag: tags })
      .from(tokenTags)
      .innerJoin(tags, eq(tokenTags.tagId, tags.id))
      .where(inArray(tokenTags.tokenId, ids))
      .orderBy(asc(tags.name));
    const byToken = new Map<Token['id'], Tag[]>();
    for (const row of tagRows) {
      const list = byToken.get(row.tokenId) ?? [];
      list.push(row.tag);
      byToken.set(row.tokenId, list);
    }
    return rows.map((row) => ({
      ...row,
      logo: row.logo?.id ? row.logo : null,
      tags: byToken.get(row.token.id) ?? [],
    }));
  }

  async selectAll(input: TokenListInput): Promise<TokenWithRelation[]> {
    const where = this.buildFilters(input);
    const rows = await this.selectBase(this.drizzleService.db)
      .where(where)
      .orderBy(desc(sql`COALESCE(${tokens.publishedAt}, ${tokens.createdAt})`))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    return this.withRelations(rows);
  }

  async count(input: TokenListInput): Promise<number> {
    const where = this.buildFilters(input);
    const [result] = await this.drizzleService.db
      .select({ value: count() })
      .from(tokens)
      .where(where);
    return result.value;
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Token['id'] | Token['slug'],
  ): Promise<TokenWithRelation> {
    const [row] = await this.selectBase(this.drizzleService.db).where(
      isUuid(identifier)
        ? eq(tokens.id, identifier)
        : eq(tokens.slug, identifier),
    );
    if (!row) throw new TokensError('TOKEN_NOT_FOUND');
    const [withTags] = await this.withRelations([row]);
    return withTags;
  }

  async insert(
    data: Pick<
      Token,
      | 'slug'
      | 'rank'
      | 'name'
      | 'ticker'
      | 'shariaStatus'
      | 'status'
      | 'excerpt'
      | 'tradingviewSymbol'
      | 'website'
      | 'logoId'
      | 'content'
      | 'publishedAt'
      | 'createdBy'
      | 'updatedBy'
    > & { tagIds: Tag['id'][] },
  ): Promise<Token> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...tokenData } = data;
        const [token] = await tx.insert(tokens).values(tokenData).returning();
        if (tagIds.length) await this.replaceTags(tx, token.id, tagIds);
        return token;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async update(
    id: Token['id'],
    data: Partial<
      Pick<
        Token,
        | 'slug'
        | 'rank'
        | 'name'
        | 'ticker'
        | 'shariaStatus'
        | 'status'
        | 'excerpt'
        | 'tradingviewSymbol'
        | 'website'
        | 'logoId'
        | 'content'
        | 'updatedBy'
      >
    > & { tagIds?: Tag['id'][] },
  ): Promise<Token> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...tokenData } = data;
        const setData =
          tokenData.status === 'published'
            ? {
                ...tokenData,
                publishedAt: sql`COALESCE(${tokens.publishedAt}, now())`,
              }
            : tokenData;
        const [token] = await tx
          .update(tokens)
          .set(setData)
          .where(eq(tokens.id, id))
          .returning();
        if (!token) throw new TokensError('TOKEN_NOT_FOUND');
        if (tagIds !== undefined) await this.replaceTags(tx, id, tagIds);
        return token;
      });
    } catch (error) {
      if (error instanceof TokensError) throw error;
      this.mapWriteError(error);
    }
  }

  async syncRank(slug: Token['slug'], rank: Token['rank']): Promise<void> {
    await this.drizzleService.db
      .update(tokens)
      .set({ rank })
      .where(eq(tokens.slug, slug));
  }

  async delete(id: Token['id']): Promise<Token> {
    const [token] = await this.drizzleService.db
      .delete(tokens)
      .where(eq(tokens.id, id))
      .returning();
    if (!token) throw new TokensError('TOKEN_NOT_FOUND');
    return token;
  }

  private async replaceTags(
    tx: DbExecutor,
    tokenId: Token['id'],
    tagIds: Tag['id'][],
  ): Promise<void> {
    await tx.delete(tokenTags).where(eq(tokenTags.tokenId, tokenId));
    if (tagIds.length) {
      await tx
        .insert(tokenTags)
        .values(tagIds.map((tagId) => ({ tokenId, tagId })));
    }
  }

  private mapWriteError(error: unknown): never {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof DatabaseError
    ) {
      if (
        error.cause.code === '23503' &&
        error.cause.constraint?.includes('logo_id')
      ) {
        throw createValidationError({
          fields: { logoId: ['Tidak ditemukan'] },
        });
      }
      if (error.cause.code === '23505') {
        if (error.cause.constraint === 'tokens_slug_unique') {
          throw new TokensError('SLUG_CONFLICT');
        }
        if (error.cause.constraint === 'tokens_ticker_unique') {
          throw new TokensError('TICKER_CONFLICT');
        }
      }
    }
    throw error;
  }
}
