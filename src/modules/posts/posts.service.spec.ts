import type { Post } from '#src/modules/drizzle/drizzle.types';
import { AuditService } from '#src/modules/audit/audit.service';
import { AssetsService } from '#src/modules/assets/assets.service';
import { TagsService } from '#src/modules/tags/tags.service';
import { PostsError } from './posts.error';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

const actor = {
  id: '3d4141e1-b27c-4a7d-a7bd-0593e79bb1ed',
  ipAddress: '127.0.0.1',
};

const post: Post = {
  id: '5d4141e1-b27c-4a7d-a7bd-0593e79bb1ed',
  title: 'Halal Investing',
  slug: 'halal-investing',
  excerpt: 'Excerpt',
  content: 'Content',
  coverImageId: '6d4141e1-b27c-4a7d-a7bd-0593e79bb1ed',
  section: 'education',
  type: 'article',
  status: 'published',
  isFeatured: false,
  eventDate: null,
  externalLink: null,
  publishedAt: new Date('2025-01-01T00:00:00.000Z'),
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  createdBy: actor.id,
  updatedBy: null,
};

describe('PostsService', () => {
  let repository: Record<string, ReturnType<typeof vi.fn>>;
  let tagsService: { resolveIdentifiers: ReturnType<typeof vi.fn> };
  let assetsService: { toAssetMetadata: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: PostsService;

  beforeEach(() => {
    repository = {
      selectAll: vi.fn(),
      count: vi.fn(),
      selectByIdentifier: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    tagsService = { resolveIdentifiers: vi.fn() };
    assetsService = { toAssetMetadata: vi.fn().mockReturnValue(null) };
    audit = { log: vi.fn() };
    service = new PostsService(
      repository as unknown as PostsRepository,
      tagsService as unknown as TagsService,
      assetsService as unknown as AssetsService,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => vi.clearAllMocks());

  it('sets publishedAt on create when the post is published', async () => {
    repository.selectByIdentifier.mockResolvedValue({
      post: { ...post, publishedAt: null },
      coverImage: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
    });
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: [],
      missing: [],
    });
    repository.insert.mockResolvedValue({ ...post, publishedAt: null });

    await service.create({ ...post, status: 'published', tags: [] }, actor);

    const insertData = repository.insert.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(insertData).toMatchObject({
      slug: post.slug,
      createdBy: actor.id,
      updatedBy: actor.id,
      tagIds: [],
    });
    expect(insertData.publishedAt).toBeInstanceOf(Date);
  });

  it('leaves publishedAt null on create for a draft', async () => {
    repository.selectByIdentifier.mockResolvedValue({
      post: { ...post, status: 'draft', publishedAt: null },
      coverImage: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
    });
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: [],
      missing: [],
    });
    repository.insert.mockResolvedValue({
      ...post,
      status: 'draft',
      publishedAt: null,
    });

    await service.create({ ...post, status: 'draft', tags: [] }, actor);

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        publishedAt: null,
        tagIds: [],
      }),
    );
  });

  it('passes tag ids to insert when tags resolve successfully', async () => {
    repository.selectByIdentifier.mockResolvedValue({
      post,
      coverImage: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
    });
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: ['tag-id'],
      missing: [],
    });
    repository.insert.mockResolvedValue(post);

    await service.create({ ...post, tags: ['education'] }, actor);

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: ['tag-id'] }),
    );
  });

  it('does not manage publishedAt on update (handled by repository)', async () => {
    repository.selectByIdentifier.mockResolvedValue({
      post,
      coverImage: null,
      tags: [],
      createdBy: null,
      updatedBy: null,
    });
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: [],
      missing: [],
    });
    repository.update.mockResolvedValue(post);

    await service.update(post.id, { title: 'Updated', tags: undefined }, actor);

    expect(repository.update).toHaveBeenCalledWith(
      post.id,
      expect.objectContaining({
        title: 'Updated',
        updatedBy: actor.id,
        tagIds: undefined,
      }),
    );
    const updateData = repository.update.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(updateData).not.toHaveProperty('publishedAt');
  });

  it('propagates a duplicate slug database conflict', async () => {
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: [],
      missing: [],
    });
    repository.insert.mockRejectedValue(new PostsError('SLUG_CONFLICT'));

    await expect(service.create({ ...post, tags: [] }, actor)).rejects.toEqual(
      new PostsError('SLUG_CONFLICT'),
    );
  });

  it('throws a validation error for an unknown tag', async () => {
    tagsService.resolveIdentifiers.mockResolvedValue({
      tagIds: [],
      missing: ['missing-tag'],
    });

    const promise = service.create({ ...post, tags: ['missing-tag'] }, actor);
    await expect(promise).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          path: ['tags'],
          message: 'Tidak dikenal: missing-tag',
        }),
      ],
    });
  });
});
