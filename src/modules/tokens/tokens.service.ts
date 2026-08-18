import { Injectable } from '@nestjs/common';
import { createValidationError } from '#src/common/create-validation-error';
import { AuditService } from '#src/modules/audit/audit.service';
import { AssetsService } from '#src/modules/assets/assets.service';
import type { Token, User } from '#src/modules/drizzle/drizzle.types';
import { MarketDataError } from '#src/modules/market-data/market-data.error';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { TagsService } from '#src/modules/tags/tags.service';
import { TokensError } from './tokens.error';
import { TokensRepository, type TokenWithRelation } from './tokens.repository';
import type {
  TokenCreateBody,
  TokenDetail,
  TokenListItem,
  TokenQuote,
  TokensQuery,
  TokenUpdateBody,
} from './tokens.schemas';

@Injectable()
export class TokensService {
  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly tagsService: TagsService,
    private readonly assetsService: AssetsService,
    private readonly marketDataService: MarketDataService,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(input: TokensQuery): Promise<TokenListItem[]> {
    const records = await this.tokensRepository.selectAll(input);
    const items = records.map((record) => this.toListItem(record));
    if (!input.quote) return items;
    return this.withQuotes(items);
  }

  count(input: TokensQuery) {
    return this.tokensRepository.count(input);
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Token['id'] | Token['slug'],
    options: { canViewNonPublished: boolean },
    withQuote: boolean,
  ): Promise<TokenDetail> {
    const record = await this.tokensRepository.selectByIdentifier(identifier);
    if (record.token.status !== 'published' && !options.canViewNonPublished) {
      throw new TokensError('TOKEN_NOT_FOUND');
    }
    const detail = this.toDetail(record);
    if (!withQuote) return detail;
    const [quoted] = await this.withQuotes([detail]);
    return quoted;
  }

  async create(
    data: TokenCreateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TokenDetail> {
    const { tagIds, missing } = await this.tagsService.resolveIdentifiers(
      data.tags,
    );
    if (missing.length) {
      throw createValidationError({
        fields: { tags: [`Tidak dikenal: ${missing.join(', ')}`] },
      });
    }

    const token = await this.tokensRepository.insert({
      slug: data.slug,
      rank: data.rank,
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
      action: 'token.create',
      subjectType: 'tokens',
      subjectId: token.id,
      description: `Buat cryptoasset: ${token.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(
      token.id,
      { canViewNonPublished: true },
      false,
    );
  }

  async update(
    id: Token['id'],
    data: TokenUpdateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TokenDetail> {
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

    const token = await this.tokensRepository.update(id, {
      slug: data.slug,
      rank: data.rank,
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
      action: 'token.update',
      subjectType: 'tokens',
      subjectId: token.id,
      description: `Edit cryptoasset: ${token.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(id, { canViewNonPublished: true }, false);
  }

  async delete(
    id: Token['id'],
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const token = await this.tokensRepository.delete(id);
    await this.auditService.log({
      userId: actor.id,
      action: 'token.delete',
      subjectType: 'tokens',
      subjectId: token.id,
      description: `Hapus cryptoasset: ${token.slug}`,
      ipAddress: actor.ipAddress,
    });
  }

  private async withQuotes<T extends { slug: string }>(
    items: T[],
  ): Promise<Array<T & { quote: TokenQuote | null }>> {
    const slugs = items.map((item) => item.slug);
    if (!slugs.length) return items as Array<T & { quote: TokenQuote | null }>;

    let quotes: TokenQuote[];
    try {
      quotes = await this.marketDataService.getQuotes({ slugs });
    } catch (error) {
      if (
        error instanceof MarketDataError &&
        error.code === 'QUOTES_FETCH_FAILED'
      ) {
        throw new TokensError('QUOTES_UNAVAILABLE');
      }
      throw error;
    }

    for (const quote of quotes) {
      void this.tokensRepository
        .syncRank(quote.slug, quote.rank)
        .catch(() => undefined);
    }

    const bySlug = new Map(quotes.map((quote) => [quote.slug, quote]));

    return items.map((item) => ({
      ...item,
      quote: bySlug.get(item.slug) ?? null,
    }));
  }

  private toListItem(record: TokenWithRelation): TokenListItem {
    return {
      id: record.token.id,
      slug: record.token.slug,
      rank: record.token.rank,
      name: record.token.name,
      ticker: record.token.ticker,
      shariaStatus: record.token.shariaStatus,
      status: record.token.status,
      excerpt: record.token.excerpt,
      tradingviewSymbol: record.token.tradingviewSymbol,
      website: record.token.website,
      publishedAt: record.token.publishedAt,
      createdAt: record.token.createdAt,
      updatedAt: record.token.updatedAt,
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

  private toDetail(record: TokenWithRelation): TokenDetail {
    return {
      id: record.token.id,
      slug: record.token.slug,
      rank: record.token.rank,
      name: record.token.name,
      ticker: record.token.ticker,
      shariaStatus: record.token.shariaStatus,
      status: record.token.status,
      excerpt: record.token.excerpt,
      tradingviewSymbol: record.token.tradingviewSymbol,
      website: record.token.website,
      content: record.token.content,
      publishedAt: record.token.publishedAt,
      createdAt: record.token.createdAt,
      updatedAt: record.token.updatedAt,
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
