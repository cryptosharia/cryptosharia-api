import { Injectable } from '@nestjs/common';
import { createValidationError } from '#src/common/create-validation-error';
import { isUuid } from '#src/common/is-uuid';
import type { Tag, User } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import type { TagsQuery, TagResponse } from './tags.schemas';
import { TagsRepository, type TagWithAudit } from './tags.repository';

type TagFilterInput = Pick<
  TagsQuery,
  'search' | 'slugs' | 'contentSections' | 'showInNavigation'
>;

@Injectable()
export class TagsService {
  constructor(
    private readonly tagsRepository: TagsRepository,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(input: TagsQuery) {
    return (await this.tagsRepository.selectAll(input)).map((record) =>
      this.toResponse(record),
    );
  }

  count(input: TagFilterInput) {
    return this.tagsRepository.count(input);
  }

  async resolveIdentifiers(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifiers: Tag['id'][] | Tag['slug'][],
  ): Promise<{ tagIds: Tag['id'][]; missing: string[] }> {
    const unique = [...new Set(identifiers)];
    if (!unique.length) return { tagIds: [], missing: [] };

    const ids = unique.filter(isUuid);
    const slugs = unique.filter((value) => !isUuid(value));
    const matched = await this.tagsRepository.selectByMixedIdentifiers({
      ids,
      slugs,
    });
    const missing = unique.filter((identifier) =>
      isUuid(identifier)
        ? !matched.some((tag) => tag.id === identifier)
        : !matched.some((tag) => tag.slug === identifier),
    );

    return {
      tagIds: [...new Set(matched.map((tag) => tag.id))],
      missing,
    };
  }

  async selectByIdentifier(
    // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
    identifier: Tag['id'] | Tag['slug'],
  ): Promise<TagResponse> {
    return this.toResponse(
      await this.tagsRepository.selectByIdentifier(identifier),
    );
  }

  async create(
    data: Pick<Tag, 'name' | 'slug'> & {
      description?: Tag['description'];
      contentSection?: Tag['contentSection'];
      showInNavigation?: Tag['showInNavigation'];
      displayOrder?: Tag['displayOrder'];
    },
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TagResponse> {
    this.assertNavigationCategory(data.showInNavigation, data.contentSection);
    const tag = await this.tagsRepository.insert({
      ...data,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await this.auditService.log({
      userId: actor.id,
      action: 'tag.create',
      subjectType: 'tags',
      subjectId: tag.id,
      description: `Buat tag: ${tag.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(tag.id);
  }

  async update(
    id: Tag['id'],
    data: Partial<
      Pick<
        Tag,
        'name' | 'slug' | 'description' | 'contentSection' | 'showInNavigation'
      > & { displayOrder?: Tag['displayOrder'] }
    >,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TagResponse> {
    const existing = await this.tagsRepository.selectByIdentifier(id);
    const nextContentSection =
      data.contentSection === undefined
        ? existing.tag.contentSection
        : data.contentSection;
    const nextShowInNavigation =
      data.showInNavigation === undefined
        ? existing.tag.showInNavigation
        : data.showInNavigation;
    this.assertNavigationCategory(nextShowInNavigation, nextContentSection);

    const tag = await this.tagsRepository.update(id, {
      ...data,
      updatedBy: actor.id,
    });
    await this.auditService.log({
      userId: actor.id,
      action: 'tag.update',
      subjectType: 'tags',
      subjectId: tag.id,
      description: `Edit tag: ${tag.slug}`,
      ipAddress: actor.ipAddress,
    });
    return this.selectByIdentifier(tag.id);
  }

  async delete(
    id: Tag['id'],
    force: boolean,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<void> {
    const tag = await this.tagsRepository.delete(id, force);
    await this.auditService.log({
      userId: actor.id,
      action: 'tag.delete',
      subjectType: 'tags',
      subjectId: tag.id,
      description: `Tag dihapus: ${tag.slug}`,
      ipAddress: actor.ipAddress,
    });
  }

  private toResponse(record: TagWithAudit): TagResponse {
    return {
      ...record.tag,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }

  private assertNavigationCategory(
    showInNavigation: boolean | undefined,
    contentSection: Tag['contentSection'],
  ): void {
    if (showInNavigation && !contentSection) {
      throw createValidationError({
        fields: {
          contentSection: ['Wajib diisi untuk kategori navigasi publik'],
        },
      });
    }
  }
}
