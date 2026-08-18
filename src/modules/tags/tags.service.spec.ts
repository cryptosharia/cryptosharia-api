import type { Tag } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import { TagsError } from './tags.error';
import { TagsRepository } from './tags.repository';
import { TagsService } from './tags.service';

const user = {
  id: '3d4141e1-b27c-4a7d-a7bd-0593e79bb1ed',
  name: 'Admin',
  email: 'admin@example.com',
};
const tag: Tag = {
  id: '5d4141e1-b27c-4a7d-a7bd-0593e79bb1ed',
  name: 'Halal Crypto',
  slug: 'halal-crypto',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: user.id,
  updatedBy: user.id,
};

describe('TagsService', () => {
  let repository: {
    selectAll: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    selectByIdentifier: ReturnType<typeof vi.fn>;
    selectByMixedIdentifiers: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: TagsService;

  beforeEach(() => {
    repository = {
      selectAll: vi.fn(),
      count: vi.fn(),
      selectByIdentifier: vi.fn(),
      selectByMixedIdentifiers: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    audit = { log: vi.fn() };
    service = new TagsService(
      repository as unknown as TagsRepository,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => vi.clearAllMocks());

  it('maps a tag record into its reusable audit response', async () => {
    repository.selectByIdentifier.mockResolvedValue({
      tag,
      createdBy: user,
      updatedBy: user,
    });

    await expect(service.selectByIdentifier(tag.slug)).resolves.toEqual({
      ...tag,
      createdBy: user,
      updatedBy: user,
    });
  });

  it('creates a tag, records the actor, and logs the event', async () => {
    repository.insert.mockResolvedValue(tag);
    repository.selectByIdentifier.mockResolvedValue({
      tag,
      createdBy: user,
      updatedBy: user,
    });

    await service.create(
      { name: tag.name, slug: tag.slug, description: null },
      { id: user.id, ipAddress: '127.0.0.1' },
    );

    expect(repository.insert).toHaveBeenCalledWith({
      name: tag.name,
      slug: tag.slug,
      description: null,
      createdBy: user.id,
      updatedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag.create', subjectId: tag.id }),
    );
  });

  it('propagates delete conflicts with usage details', async () => {
    const error = new TagsError('TAG_IN_USE', {
      usage: { posts: 2, tokens: 1 },
    });
    repository.delete.mockRejectedValue(error);

    await expect(service.delete(tag.id, false, { id: user.id })).rejects.toBe(
      error,
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('resolves mixed UUID and slug identifiers and reports missing values', async () => {
    const matchedTag = { ...tag, id: 'aaaa1111-b27c-4a7d-a7bd-0593e79bb1ed' };
    repository.selectByMixedIdentifiers.mockResolvedValue([matchedTag]);

    const result = await service.resolveIdentifiers([
      matchedTag.id,
      tag.slug,
      'missing-tag',
    ]);

    expect(repository.selectByMixedIdentifiers).toHaveBeenCalledWith({
      ids: [matchedTag.id],
      slugs: [tag.slug, 'missing-tag'],
    });
    expect(result).toEqual({
      tagIds: [matchedTag.id],
      missing: ['missing-tag'],
    });
  });

  it('returns empty results for no identifiers', async () => {
    await expect(service.resolveIdentifiers([])).resolves.toEqual({
      tagIds: [],
      missing: [],
    });
    expect(repository.selectByMixedIdentifiers).not.toHaveBeenCalled();
  });
});
