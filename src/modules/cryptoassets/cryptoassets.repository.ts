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
  cryptoassetTags,
  cryptoassets,
  tags,
  users,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type {
  Asset,
  Cryptoasset,
  DbExecutor,
  Tag,
} from '#src/modules/drizzle/drizzle.types';
import type { CryptoassetsQuery } from './cryptoassets.schemas';
import { CryptoassetsError } from './cryptoassets.error';

export type CryptoassetWithRelation = {
  cryptoasset: Cryptoasset;
  logo: Asset | null;
  tags: Tag[];
  createdBy: AuditMetadata['createdBy'];
  updatedBy: AuditMetadata['updatedBy'];
};

const createdByUser = alias(users, 'cryptoasset_created_by');
const updatedByUser = alias(users, 'cryptoasset_updated_by');

@Injectable()
export class CryptoassetsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private selectBase(dbExecutor: DbExecutor) {
    return dbExecutor
      .select({
        cryptoasset: cryptoassets,
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
      .from(cryptoassets)
      .leftJoin(assets, eq(cryptoassets.logoId, assets.id))
      .leftJoin(createdByUser, eq(cryptoassets.createdBy, createdByUser.id))
      .leftJoin(updatedByUser, eq(cryptoassets.updatedBy, updatedByUser.id));
  }

  private buildFilters(input: CryptoassetsQuery): SQL | undefined {
    const filters: SQL[] = [];
    if (input.statuses?.length)
      filters.push(inArray(cryptoassets.status, input.statuses));
    if (input.shariaStatuses?.length)
      filters.push(inArray(cryptoassets.shariaStatus, input.shariaStatuses));
    if (input.slugs?.length)
      filters.push(inArray(cryptoassets.slug, input.slugs));
    if (input.exclude?.length)
      filters.push(notInArray(cryptoassets.slug, input.exclude));
    if (input.tags?.length) {
      const matchingCryptoassetIds = this.drizzleService.db
        .select({ cryptoassetId: cryptoassetTags.cryptoassetId })
        .from(cryptoassetTags)
        .innerJoin(tags, eq(cryptoassetTags.tagId, tags.id))
        .where(inArray(tags.slug, input.tags));
      filters.push(inArray(cryptoassets.id, matchingCryptoassetIds));
    }
    if (input.search) {
      const pattern = `%${escapeLikePattern(input.search)}%`;
      filters.push(
        or(
          ilike(cryptoassets.name, pattern),
          ilike(cryptoassets.ticker, pattern),
          ilike(cryptoassets.slug, pattern),
          ilike(cryptoassets.excerpt, pattern),
          ilike(cryptoassets.content, pattern),
        )!,
      );
    }
    return filters.length ? and(...filters) : undefined;
  }

  private async withRelations(
    rows: Array<Omit<CryptoassetWithRelation, 'tags'>>,
  ): Promise<CryptoassetWithRelation[]> {
    if (!rows.length) return rows as CryptoassetWithRelation[];
    const ids = rows.map((row) => row.cryptoasset.id);
    const tagRows = await this.drizzleService.db
      .select({ cryptoassetId: cryptoassetTags.cryptoassetId, tag: tags })
      .from(cryptoassetTags)
      .innerJoin(tags, eq(cryptoassetTags.tagId, tags.id))
      .where(inArray(cryptoassetTags.cryptoassetId, ids))
      .orderBy(asc(tags.name));
    const byCryptoasset = new Map<Cryptoasset['id'], Tag[]>();
    for (const row of tagRows) {
      const list = byCryptoasset.get(row.cryptoassetId) ?? [];
      list.push(row.tag);
      byCryptoasset.set(row.cryptoassetId, list);
    }
    return rows.map((row) => ({
      ...row,
      logo: row.logo?.id ? row.logo : null,
      tags: byCryptoasset.get(row.cryptoasset.id) ?? [],
    }));
  }

  async selectAll(
    input: CryptoassetsQuery,
  ): Promise<CryptoassetWithRelation[]> {
    const where = this.buildFilters(input);
    const rows = await this.selectBase(this.drizzleService.db)
      .where(where)
      .orderBy(
        desc(
          sql`COALESCE(${cryptoassets.publishedAt}, ${cryptoassets.createdAt})`,
        ),
      )
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
    return this.withRelations(rows);
  }

  async count(input: CryptoassetsQuery): Promise<number> {
    const where = this.buildFilters(input);
    const [result] = await this.drizzleService.db
      .select({ value: count() })
      .from(cryptoassets)
      .where(where);
    return result.value;
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Cryptoasset['id'] | Cryptoasset['slug'],
  ): Promise<CryptoassetWithRelation> {
    const [row] = await this.selectBase(this.drizzleService.db).where(
      isUuid(identifier)
        ? eq(cryptoassets.id, identifier)
        : eq(cryptoassets.slug, identifier),
    );
    if (!row) throw new CryptoassetsError('CRYPTOASSET_NOT_FOUND');
    const [withTags] = await this.withRelations([row]);
    return withTags;
  }

  async insert(
    data: Pick<
      Cryptoasset,
      | 'slug'
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
  ): Promise<Cryptoasset> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...cryptoassetData } = data;
        const [cryptoasset] = await tx
          .insert(cryptoassets)
          .values(cryptoassetData)
          .returning();
        if (tagIds.length) await this.replaceTags(tx, cryptoasset.id, tagIds);
        return cryptoasset;
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async update(
    id: Cryptoasset['id'],
    data: Partial<
      Pick<
        Cryptoasset,
        | 'slug'
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
  ): Promise<Cryptoasset> {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        const { tagIds, ...cryptoassetData } = data;
        const setData =
          cryptoassetData.status === 'published'
            ? {
                ...cryptoassetData,
                publishedAt: sql`COALESCE(${cryptoassets.publishedAt}, now())`,
              }
            : cryptoassetData;
        const [cryptoasset] = await tx
          .update(cryptoassets)
          .set(setData)
          .where(eq(cryptoassets.id, id))
          .returning();
        if (!cryptoasset) throw new CryptoassetsError('CRYPTOASSET_NOT_FOUND');
        if (tagIds !== undefined) await this.replaceTags(tx, id, tagIds);
        return cryptoasset;
      });
    } catch (error) {
      if (error instanceof CryptoassetsError) throw error;
      this.mapWriteError(error);
    }
  }

  async delete(id: Cryptoasset['id']): Promise<Cryptoasset> {
    const [cryptoasset] = await this.drizzleService.db
      .delete(cryptoassets)
      .where(eq(cryptoassets.id, id))
      .returning();
    if (!cryptoasset) throw new CryptoassetsError('CRYPTOASSET_NOT_FOUND');
    return cryptoasset;
  }

  private async replaceTags(
    tx: DbExecutor,
    cryptoassetId: Cryptoasset['id'],
    tagIds: Tag['id'][],
  ): Promise<void> {
    await tx
      .delete(cryptoassetTags)
      .where(eq(cryptoassetTags.cryptoassetId, cryptoassetId));
    if (tagIds.length) {
      await tx
        .insert(cryptoassetTags)
        .values(tagIds.map((tagId) => ({ cryptoassetId, tagId })));
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
        if (error.cause.constraint === 'cryptoassets_slug_unique') {
          throw new CryptoassetsError('SLUG_CONFLICT');
        }
        if (error.cause.constraint === 'cryptoassets_ticker_unique') {
          throw new CryptoassetsError('TICKER_CONFLICT');
        }
      }
    }
    throw error;
  }
}
