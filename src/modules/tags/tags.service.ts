import { Injectable } from '@nestjs/common';
import { isUuid } from '#src/common/is-uuid';
import type { Tag, User } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import type { TagResponse } from './tags.schemas';
import { TagsRepository, type TagWithAudit } from './tags.repository';

@Injectable()
export class TagsService {
  constructor(
    private readonly tagsRepository: TagsRepository,
    private readonly auditService: AuditService,
  ) {}

  async selectAll(input: {
    page: number;
    limit: number;
    search?: string;
    slugs?: string[];
  }) {
    return (await this.tagsRepository.selectAll(input)).map((record) =>
      this.toResponse(record),
    );
  }

  count(input: { search?: string; slugs?: string[] }) {
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
    data: Pick<Tag, 'name' | 'slug'> & { description?: Tag['description'] },
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TagResponse> {
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
    data: Partial<Pick<Tag, 'name' | 'slug' | 'description'>>,
    actor: { id: User['id']; ipAddress?: string },
  ): Promise<TagResponse> {
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
}
