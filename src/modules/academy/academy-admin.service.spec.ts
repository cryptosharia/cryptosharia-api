import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AcademyContent, AcademyLessonMedia, AcademyScope, AcademyGrant } from '#src/modules/drizzle/drizzle.types';
import { AcademyError } from './academy.error';
import { AcademyRepository } from './academy.repository';
import { AcademyService } from './academy.service';

describe('AcademyService Admin CMS Operations', () => {
  let repository: AcademyRepository;
  let service: AcademyService;

  beforeEach(() => {
    repository = {} as AcademyRepository;
    service = new AcademyService(repository);
  });

  describe('Scope Management', () => {
    it('creates scope successfully', async () => {
      const mockScope: AcademyScope = {
        id: 'advanced-crypto',
        name: 'Advanced Crypto',
        description: 'Advanced track',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
      };
      repository.insertScope = vi.fn().mockResolvedValue(mockScope);

      const result = await service.createScope({
        id: 'advanced-crypto',
        name: 'Advanced Crypto',
        description: 'Advanced track',
        isActive: true,
        createdBy: 'admin-1',
      });

      expect(repository.insertScope).toHaveBeenCalledWith({
        id: 'advanced-crypto',
        name: 'Advanced Crypto',
        description: 'Advanced track',
        isActive: true,
        createdBy: 'admin-1',
      });
      expect(result.id).toBe('advanced-crypto');
    });

    it('updates scope successfully', async () => {
      const mockScope: AcademyScope = {
        id: 'advanced-crypto',
        name: 'Updated Name',
        description: 'Updated desc',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1',
        updatedBy: 'admin-2',
      };
      repository.updateScope = vi.fn().mockResolvedValue(mockScope);

      const result = await service.updateScope('advanced-crypto', {
        name: 'Updated Name',
        updatedBy: 'admin-2',
      });

      expect(repository.updateScope).toHaveBeenCalledWith('advanced-crypto', {
        name: 'Updated Name',
        updatedBy: 'admin-2',
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('Content Hierarchy & Creation', () => {
    it('rejects subject creation when parentId is not root or id does not match subjectId', async () => {
      await expect(
        service.createContent({
          id: 'invalid-subject',
          kind: 'subject',
          parentId: 'something-else',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 0,
          title: 'Invalid Subject',
          description: '',
          thumbnail: '/favicon.png',
          durationSeconds: 0,
          instructor: '',
          syariahRequired: false,
          createdBy: 'admin-1',
        }),
      ).rejects.toThrow(AcademyError);
    });

    it('rejects level creation when parent subject is not found', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue(null);

      await expect(
        service.createContent({
          id: 'fundamental-l1',
          kind: 'level',
          parentId: 'fundamental',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          title: 'Level 1',
          description: '',
          thumbnail: '/favicon.png',
          durationSeconds: 0,
          instructor: '',
          syariahRequired: false,
          createdBy: 'admin-1',
        }),
      ).rejects.toThrow(AcademyError);
    });

    it('rejects chapter creation if parent is not level kind', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'fundamental',
        kind: 'subject', // expected 'level' for chapter parent
      } as AcademyContent);

      await expect(
        service.createContent({
          id: 'fundamental-l1-c1',
          kind: 'chapter',
          parentId: 'fundamental',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          title: 'Bab 1',
          description: '',
          thumbnail: '/favicon.png',
          durationSeconds: 0,
          instructor: '',
          syariahRequired: false,
          createdBy: 'admin-1',
        }),
      ).rejects.toThrow(AcademyError);
    });
  });

  describe('Content Status Transitions', () => {
    it('rejects illegal transition from draft directly to published', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
        status: 'draft',
      } as AcademyContent);

      await expect(
        service.transitionContentStatus('lesson-1', 'published', 'admin-1'),
      ).rejects.toThrow(AcademyError);
    });

    it('rejects review -> approved transition when rights are not confirmed', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
        status: 'review',
      } as AcademyContent);

      await expect(
        service.transitionContentStatus('lesson-1', 'approved', 'admin-1', false),
      ).rejects.toThrow(AcademyError);
    });

    it('rejects approved -> published transition for lesson if media has no videoId', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
        status: 'approved',
      } as AcademyContent);
      repository.selectLessonMedia = vi.fn().mockResolvedValue(null);

      await expect(
        service.transitionContentStatus('lesson-1', 'published', 'admin-1'),
      ).rejects.toThrow(AcademyError);
    });

    it('allows approved -> published transition for lesson with valid media', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
        status: 'approved',
      } as AcademyContent);
      repository.selectLessonMedia = vi.fn().mockResolvedValue({
        lessonId: 'lesson-1',
        videoId: 'dQw4w9WgXcQ',
      } as AcademyLessonMedia);
      repository.transitionContentStatus = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
        status: 'published',
      } as AcademyContent);

      const result = await service.transitionContentStatus('lesson-1', 'published', 'admin-1');
      expect(result.status).toBe('published');
    });
  });

  describe('Grants & Media', () => {
    it('sets lesson media successfully', async () => {
      repository.selectContentById = vi.fn().mockResolvedValue({
        id: 'lesson-1',
        kind: 'lesson',
      } as AcademyContent);
      repository.upsertLessonMedia = vi.fn().mockResolvedValue({
        lessonId: 'lesson-1',
        videoId: 'dQw4w9WgXcQ',
      } as AcademyLessonMedia);

      const result = await service.setLessonMedia('lesson-1', {
        videoId: 'dQw4w9WgXcQ',
        readingRefs: [],
        slideRefs: [],
        subtitleRefs: [],
        attachmentRefs: [],
        updatedBy: 'admin-1',
      });

      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('revokes grant successfully', async () => {
      repository.revokeGrant = vi.fn().mockResolvedValue({
        id: 'grant-1',
        state: 'revoked',
      } as AcademyGrant);

      const result = await service.revokeGrant('grant-1', 'admin-1');
      expect(result.state).toBe('revoked');
    });
  });
});
