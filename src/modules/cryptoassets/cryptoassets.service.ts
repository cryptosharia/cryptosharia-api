import { Injectable } from '@nestjs/common';
import { createValidationError } from '#src/common/create-validation-error';
import { AuditService } from '#src/modules/audit/audit.service';
import { AssetsService } from '#src/modules/assets/assets.service';
import type { Cryptoasset, User } from '#src/modules/drizzle/drizzle.types';
import { MarketDataError } from '#src/modules/market-data/market-data.error';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { TagsService } from '#src/modules/tags/tags.service';
import { CryptoassetsError } from './cryptoassets.error';
import {
  CryptoassetsRepository,
  type CryptoassetWithRelation,
} from './cryptoassets.repository';
import type {
  CryptoassetCreateBody,
  CryptoassetDetail,
  CryptoassetListItem,
  CryptoassetQuote,
  CryptoassetsQuery,
  CryptoassetUpdateBody,
} from './cryptoassets.schemas';

@Injectable()
export class CryptoassetsService {
  constructor(
    private readonly cryptoassetsRepository: CryptoassetsRepository,
    private readonly tagsService: TagsService,
    private readonly assetsService: AssetsService,
    private readonly marketDataService: MarketDataService,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(input: CryptoassetsQuery): Promise<CryptoassetListItem[]> {
    const records = await this.cryptoassetsRepository.selectAll(input);
    const items = records.map((record) => this.toListItem(record));
    if (!input.quote) return items;
    return this.withQuotes(items);
  }

  count(input: CryptoassetsQuery) {
    return this.cryptoassetsRepository.count(input);
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Cryptoasset['id'] | Cryptoasset['slug'],
    options: { canViewNonPublished: boolean },
    withQuote: boolean,
  ): Promise<CryptoassetDetail> {
    const record =
      await this.cryptoassetsRepository.selectByIdentifier(identifier);
    if (
      record.cryptoasset.status !== 'published' &&
      !options.canViewNonPublished
    ) {
      throw new CryptoassetsError('CRYPTOASSET_NOT_FOUND');
    }
    const detail = this.toDetail(record);
    if (!withQuote) return detail;
    const [quoted] = await this.withQuotes([detail]);
    return quoted;
  }

  async create(
    data: CryptoassetCreateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<CryptoassetDetail> {
    const { tagIds, missing } = await this.tagsService.resolveIdentifiers(
      data.tags,
    );
    if (missing.length) {
      throw createValidationError({
        fields: { tags: [`Tidak dikenal: ${missing.join(', ')}`] },
      });
    }

    const cryptoasset = await this.cryptoassetsRepository.insert({
      slug: data.slug,
      name: data.name,
      ticker: data.ticker,
      shariaStatus: data.shariaStatus,
      status: data.status,
      excerpt: data.excerpt,
      tradingviewSymbol: data.tradingviewSymbol,
      website: data.website,
      logoId: data.logoId,
      content: data.content,
      publishedAt: data.status === 'published' ? new Date() : null,
      createdBy: actor.id,
      updatedBy: actor.id,
      tagIds,
    });
    await this.auditService.log({
      userId: actor.id,
      action: 'cryptoasset.create',
      subjectType: 'cryptoassets',
      subjectId: cryptoasset.id,
      description: `Buat cryptoasset: ${cryptoasset.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(
      cryptoasset.id,
      { canViewNonPublished: true },
      false,
    );
  }

  async update(
    id: Cryptoasset['id'],
    data: CryptoassetUpdateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<CryptoassetDetail> {
    let resolvedTagIds: string[] | undefined;
    if (data.tags !== undefined) {
      const { tagIds, missing } = await this.tagsService.resolveIdentifiers(
        data.tags,
      );
      if (missing.length) {
        throw createValidationError({
          fields: { tags: [`Tidak dikenal: ${missing.join(', ')}`] },
        });
      }
      resolvedTagIds = tagIds;
    }

    const cryptoasset = await this.cryptoassetsRepository.update(id, {
      slug: data.slug,
      name: data.name,
      ticker: data.ticker,
      shariaStatus: data.shariaStatus,
      status: data.status,
      excerpt: data.excerpt,
      tradingviewSymbol: data.tradingviewSymbol,
      website: data.website,
      logoId: data.logoId,
      content: data.content,
      updatedBy: actor.id,
      tagIds: resolvedTagIds,
    });
    await this.auditService.log({
      userId: actor.id,
      action: 'cryptoasset.update',
      subjectType: 'cryptoassets',
      subjectId: cryptoasset.id,
      description: `Edit cryptoasset: ${cryptoasset.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(id, { canViewNonPublished: true }, false);
  }

  async delete(
    id: Cryptoasset['id'],
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const cryptoasset = await this.cryptoassetsRepository.delete(id);
    await this.auditService.log({
      userId: actor.id,
      action: 'cryptoasset.delete',
      subjectType: 'cryptoassets',
      subjectId: cryptoasset.id,
      description: `Hapus cryptoasset: ${cryptoasset.slug}`,
      ipAddress: actor.ipAddress,
    });
  }

  private async withQuotes<T extends { slug: string }>(
    items: T[],
  ): Promise<Array<T & { quote: CryptoassetQuote | null }>> {
    const slugs = items.map((item) => item.slug);
    if (!slugs.length) {
      return items as Array<T & { quote: CryptoassetQuote | null }>;
    }

    let quotes: CryptoassetQuote[];
    try {
      quotes = await this.marketDataService.getQuotes({ slugs });
    } catch (error) {
      if (
        error instanceof MarketDataError &&
        error.code === 'QUOTES_FETCH_FAILED'
      ) {
        throw new CryptoassetsError('QUOTES_UNAVAILABLE');
      }
      throw error;
    }

    const bySlug = new Map(quotes.map((quote) => [quote.slug, quote]));

    return items.map((item) => ({
      ...item,
      quote: bySlug.get(item.slug) ?? null,
    }));
  }

  private toListItem(record: CryptoassetWithRelation): CryptoassetListItem {
    return {
      id: record.cryptoasset.id,
      slug: record.cryptoasset.slug,
      name: record.cryptoasset.name,
      ticker: record.cryptoasset.ticker,
      shariaStatus: record.cryptoasset.shariaStatus,
      status: record.cryptoasset.status,
      excerpt: record.cryptoasset.excerpt,
      tradingviewSymbol: record.cryptoasset.tradingviewSymbol,
      website: record.cryptoasset.website,
      publishedAt: record.cryptoasset.publishedAt,
      createdAt: record.cryptoasset.createdAt,
      updatedAt: record.cryptoasset.updatedAt,
      logo: this.assetsService.toAssetMetadata(record.logo),
      tags: record.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }

  private toDetail(record: CryptoassetWithRelation): CryptoassetDetail {
    return {
      id: record.cryptoasset.id,
      slug: record.cryptoasset.slug,
      name: record.cryptoasset.name,
      ticker: record.cryptoasset.ticker,
      shariaStatus: record.cryptoasset.shariaStatus,
      status: record.cryptoasset.status,
      excerpt: record.cryptoasset.excerpt,
      tradingviewSymbol: record.cryptoasset.tradingviewSymbol,
      website: record.cryptoasset.website,
      content: record.cryptoasset.content,
      publishedAt: record.cryptoasset.publishedAt,
      createdAt: record.cryptoasset.createdAt,
      updatedAt: record.cryptoasset.updatedAt,
      logo: this.assetsService.toAssetMetadata(record.logo),
      tags: record.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
      })),
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }
}
