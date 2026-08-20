import { Injectable } from '@nestjs/common';
import { createValidationError } from '#src/common/create-validation-error';
import { AuditService } from '#src/modules/audit/audit.service';
import { AssetsService } from '#src/modules/assets/assets.service';
import type { Post, User } from '#src/modules/drizzle/drizzle.types';
import { TagsService } from '#src/modules/tags/tags.service';
import { PostsError } from './posts.error';
import { PostsRepository, type PostWithRelation } from './posts.repository';
import type {
  PostsQuery,
  PostCreateBody,
  PostDetail,
  PostListItem,
  PostUpdateBody,
} from './posts.schemas';

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly tagsService: TagsService,
    private readonly assetsService: AssetsService,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(input: PostsQuery): Promise<PostListItem[]> {
    const records = await this.postsRepository.selectAll(input);
    return records.map((record) => this.toListItem(record));
  }

  count(input: PostsQuery) {
    return this.postsRepository.count(input);
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Post['id'] | Post['slug'],
    options: { canViewNonPublished: boolean },
  ): Promise<PostDetail> {
    const record = await this.postsRepository.selectByIdentifier(identifier);
    if (record.post.status !== 'published' && !options.canViewNonPublished) {
      throw new PostsError('POST_NOT_FOUND');
    }
    return this.toDetail(record);
  }

  async create(
    data: PostCreateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<PostDetail> {
    const { tagIds, missing } = await this.tagsService.resolveIdentifiers(
      data.tags,
    );

    if (missing.length) {
      throw createValidationError({
        fields: {
          tags: [`Tidak dikenal: ${missing.join(', ')}`],
        },
      });
    }

    const post = await this.postsRepository.insert({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImageId: data.coverImageId,
      section: data.section,
      type: data.type,
      status: data.status,
      isFeatured: data.isFeatured,
      eventDate: data.eventDate,
      externalLink: data.externalLink,
      publishedAt: data.status === 'published' ? new Date() : null,
      createdBy: actor.id,
      updatedBy: actor.id,
      tagIds,
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'post.create',
      subjectType: 'posts',
      subjectId: post.id,
      description: `Buat post: ${post.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(post.id, { canViewNonPublished: true });
  }

  async update(
    id: Post['id'],
    data: PostUpdateBody,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<PostDetail> {
    let resolvedTagIds: string[] | undefined;
    if (data.tags !== undefined) {
      const { tagIds, missing } = await this.tagsService.resolveIdentifiers(
        data.tags,
      );
      if (missing.length) {
        throw createValidationError({
          fields: {
            tags: [`Tidak dikenal: ${missing.join(', ')}`],
          },
        });
      }
      resolvedTagIds = tagIds;
    }

    const post = await this.postsRepository.update(id, {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImageId: data.coverImageId,
      section: data.section,
      type: data.type,
      status: data.status,
      isFeatured: data.isFeatured,
      eventDate: data.eventDate,
      externalLink: data.externalLink,
      updatedBy: actor.id,
      tagIds: resolvedTagIds,
    });
    await this.auditService.log({
      userId: actor.id,
      action: 'post.update',
      subjectType: 'posts',
      subjectId: post.id,
      description: `Edit post: ${post.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(id, { canViewNonPublished: true });
  }

  async delete(
    id: Post['id'],
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const post = await this.postsRepository.delete(id);
    await this.auditService.log({
      userId: actor.id,
      action: 'post.delete',
      subjectType: 'posts',
      subjectId: post.id,
      description: `Hapus post: ${post.slug}`,
      ipAddress: actor.ipAddress,
    });
  }

  private toListItem(record: PostWithRelation): PostListItem {
    return {
      id: record.post.id,
      title: record.post.title,
      slug: record.post.slug,
      excerpt: record.post.excerpt,
      section: record.post.section,
      type: record.post.type,
      status: record.post.status,
      isFeatured: record.post.isFeatured,
      eventDate: record.post.eventDate,
      externalLink: record.post.externalLink,
      publishedAt: record.post.publishedAt,
      createdAt: record.post.createdAt,
      updatedAt: record.post.updatedAt,
      coverImage: this.assetsService.toAssetMetadata(record.coverImage),
      tags: record.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }

  private toDetail(record: PostWithRelation): PostDetail {
    return {
      id: record.post.id,
      title: record.post.title,
      slug: record.post.slug,
      excerpt: record.post.excerpt,
      content: record.post.content,
      section: record.post.section,
      type: record.post.type,
      status: record.post.status,
      isFeatured: record.post.isFeatured,
      eventDate: record.post.eventDate,
      externalLink: record.post.externalLink,
      publishedAt: record.post.publishedAt,
      createdAt: record.post.createdAt,
      updatedAt: record.post.updatedAt,
      coverImage: this.assetsService.toAssetMetadata(record.coverImage),
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
