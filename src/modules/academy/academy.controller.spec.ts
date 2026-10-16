import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '#src/modules/security/current-user.decorator';
import { AcademyController } from './academy.controller';
import { AcademyError } from './academy.error';
import { AcademyExceptionFilter } from './academy.exception-filter';
import type { AcademyService } from './academy.service';

describe('AcademyController Unit Tests', () => {
  const mockCurrentUser: CurrentUser = {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'member',
    permissions: [],
  };

  const mockService = {
    getCatalog: vi.fn(),
    getCurriculum: vi.fn(),
    getAuthorizedLessonMedia: vi.fn(),
    getUserGrants: vi.fn(),
    getUserProgress: vi.fn(),
    recordProgress: vi.fn(),
    getCompletionsWithSummary: vi.fn(),
    markLessonComplete: vi.fn(),
  };

  const controller = new AcademyController(
    mockService as unknown as AcademyService,
  );

  describe('GET /academy/catalog', () => {
    it('returns published lesson catalog and strips private fields', async () => {
      mockService.getCatalog.mockResolvedValue([
        {
          id: 'lesson-1',
          kind: 'lesson',
          parentId: 'chapter-1',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: 'scope-a',
          title: 'Pengenalan Halal Crypto',
          description: 'Materi dasar',
          thumbnail: '/cover.png',
          durationSeconds: 300,
          instructor: 'Ust. Sholahuddin',
          status: 'published',
          version: 1,
          publishedAt: new Date('2026-10-01T00:00:00Z'),
          // Internal editorial fields
          syariahRequired: false,
          reviewedBy: 'reviewer-id',
          rightsConfirmed: true,
          internalNote: 'Private note',
        },
      ]);

      const result = await controller.getCatalog({ scopeId: 'scope-a' });

      expect(mockService.getCatalog).toHaveBeenCalledWith('scope-a');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lesson-1');
      expect(result[0].title).toBe('Pengenalan Halal Crypto');
      // Assert private/internal fields are strictly omitted
      expect(
        (result[0] as Record<string, unknown>).internalNote,
      ).toBeUndefined();
      expect((result[0] as Record<string, unknown>).reviewedBy).toBeUndefined();
      expect((result[0] as Record<string, unknown>).videoId).toBeUndefined();
    });
  });

  describe('GET /academy/curriculum', () => {
    it('returns published curriculum items for frontend tree', async () => {
      mockService.getCurriculum.mockResolvedValue([
        {
          id: 'fundamental',
          kind: 'subject',
          parentId: 'root',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 0,
          scopeId: null,
          title: 'Analisis Fundamental',
          description: '',
          thumbnail: '',
          durationSeconds: 0,
          instructor: '',
          status: 'published',
          version: 1,
          publishedAt: new Date('2026-10-01T00:00:00Z'),
        },
      ]);

      const result = await controller.getCurriculum();

      expect(mockService.getCurriculum).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('subject');
      expect((result[0] as Record<string, unknown>).videoId).toBeUndefined();
    });
  });

  describe('GET /academy/lessons/:id', () => {
    it('delivers 11-char videoId and media refs to authorized participant', async () => {
      mockService.getAuthorizedLessonMedia.mockResolvedValue({
        lesson: {
          id: 'lesson-1',
          kind: 'lesson',
          parentId: 'chapter-1',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: 'scope-a',
          title: 'Pelajaran 1',
          description: '',
          thumbnail: '',
          durationSeconds: 600,
          instructor: 'Ust. Sholahuddin',
          status: 'published',
          version: 1,
          publishedAt: new Date('2026-10-01T00:00:00Z'),
        },
        media: {
          lessonId: 'lesson-1',
          videoId: 'dQw4w9WgXcQ',
          version: 1,
          readingRefs: ['https://ref.example.com/reading'],
          slideRefs: [],
          subtitleRefs: [],
          attachmentRefs: [],
          internalNote: 'Internal note for editors',
        },
      });

      const result = await controller.getLesson(
        { id: 'lesson-1' },
        mockCurrentUser,
      );

      expect(mockService.getAuthorizedLessonMedia).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'lesson-1',
      );
      expect(result.media.videoId).toBe('dQw4w9WgXcQ');
      expect(result.media.readingRefs).toEqual([
        'https://ref.example.com/reading',
      ]);
      // Internal notes strictly excluded from learner response
      expect(
        (result.media as Record<string, unknown>).internalNote,
      ).toBeUndefined();
    });
  });

  describe('GET /academy/me/grants', () => {
    it('returns participant entitlement grants', async () => {
      const grantDate = new Date('2026-10-01T00:00:00Z');
      mockService.getUserGrants.mockResolvedValue([
        {
          id: 'grant-1',
          userId: mockCurrentUser.id,
          scopeId: 'scope-a',
          state: 'active',
          startsAt: grantDate,
          expiresAt: new Date('2026-12-31T00:00:00Z'),
          source: 'manual',
          auditId: 'audit-123',
          createdAt: grantDate,
          updatedAt: grantDate,
        },
      ]);

      const result = await controller.getMyGrants(mockCurrentUser);

      expect(mockService.getUserGrants).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toHaveLength(1);
      expect(result[0].scopeId).toBe('scope-a');
      expect(result[0].state).toBe('active');
    });
  });

  describe('GET & PUT /academy/me/progress', () => {
    it('returns resume positions belonging to participant', async () => {
      const now = new Date();
      mockService.getUserProgress.mockResolvedValue([
        {
          userId: mockCurrentUser.id,
          lessonId: 'lesson-1',
          version: 1,
          positionSeconds: 120,
          updatedAt: now,
        },
      ]);

      const result = await controller.getMyProgress(mockCurrentUser);

      expect(mockService.getUserProgress).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toHaveLength(1);
      expect(result[0].positionSeconds).toBe(120);
    });

    it('persists bounded playback position', async () => {
      mockService.recordProgress.mockResolvedValue(undefined);

      const result = await controller.updateMyProgress(
        { lessonId: 'lesson-1' },
        { version: 1, positionSeconds: 245 },
        mockCurrentUser,
      );

      expect(mockService.recordProgress).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'lesson-1',
        1,
        245,
      );
      expect(result).toEqual({
        success: true,
        lessonId: 'lesson-1',
        version: 1,
        positionSeconds: 245,
      });
    });
  });

  describe('GET & POST /academy/me/completions', () => {
    it('returns user completions and aggregate learning progress summary', async () => {
      const now = new Date();
      mockService.getCompletionsWithSummary.mockResolvedValue({
        completions: [
          {
            userId: mockCurrentUser.id,
            lessonId: 'lesson-1',
            version: 1,
            completedAt: now,
          },
        ],
        summary: {
          completed: 1,
          total: 2,
          percentage: 50,
        },
      });

      const result = await controller.getMyCompletions(
        { scopeId: 'scope-a' },
        mockCurrentUser,
      );

      expect(mockService.getCompletionsWithSummary).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'scope-a',
      );
      expect(result.completions).toHaveLength(1);
      expect(result.summary).toEqual({
        completed: 1,
        total: 2,
        percentage: 50,
      });
    });

    it('marks lesson complete idempotently', async () => {
      mockService.markLessonComplete.mockResolvedValue(undefined);

      const result = await controller.markLessonComplete(
        { lessonId: 'lesson-1' },
        { version: 1 },
        mockCurrentUser,
      );

      expect(mockService.markLessonComplete).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'lesson-1',
        1,
      );
      expect(result).toEqual({
        success: true,
        lessonId: 'lesson-1',
        version: 1,
      });
    });
  });

  describe('AcademyExceptionFilter', () => {
    const filter = new AcademyExceptionFilter();

    const asArgumentsHost = (host: unknown) => host as ArgumentsHost;

    const createMockHost = () => {
      const statusFn = vi.fn().mockReturnThis();
      const sendFn = vi.fn().mockReturnThis();
      const reply = { status: statusFn, send: sendFn };
      const host = {
        switchToHttp: () => ({
          getResponse: () => reply,
        }),
      };
      return { host, reply, statusFn, sendFn };
    };

    it('maps CONTENT_NOT_FOUND and LESSON_NOT_PUBLISHED to 404', () => {
      const { host, statusFn, sendFn } = createMockHost();
      filter.catch(
        new AcademyError('CONTENT_NOT_FOUND'),
        asArgumentsHost(host),
      );
      expect(statusFn).toHaveBeenCalledWith(404);
      const body = sendFn.mock.calls[0]?.[0] as unknown as {
        error: string;
        message: unknown;
      };
      expect(body.error).toBe('CONTENT_NOT_FOUND');
      expect(typeof body.message).toBe('string');

      const { host: host2, statusFn: statusFn2 } = createMockHost();
      filter.catch(
        new AcademyError('LESSON_NOT_PUBLISHED'),
        asArgumentsHost(host2),
      );
      expect(statusFn2).toHaveBeenCalledWith(404);
    });

    it('maps entitlement failures to 403 Forbidden', () => {
      for (const code of [
        'GRANT_NOT_FOUND',
        'GRANT_REVOKED',
        'GRANT_EXPIRED',
        'GRANT_NOT_STARTED',
        'UNAUTHORIZED_SCOPE',
      ] as const) {
        const { host, statusFn, sendFn } = createMockHost();
        filter.catch(new AcademyError(code), asArgumentsHost(host));
        expect(statusFn).toHaveBeenCalledWith(403);
        const body = sendFn.mock.calls[0]?.[0] as unknown as {
          error: string;
          message: unknown;
        };
        expect(body.error).toBe(code);
        expect(typeof body.message).toBe('string');
      }
    });

    it('maps bad requests (version mismatch, bounds) to 400 Bad Request', () => {
      for (const code of [
        'COMPLETION_VERSION_MISMATCH',
        'INVALID_PROGRESS_POSITION',
        'INVALID_CONTENT_HIERARCHY',
        'DUPLICATE_CONTENT_ORDER',
      ] as const) {
        const { host, statusFn, sendFn } = createMockHost();
        filter.catch(new AcademyError(code), asArgumentsHost(host));
        expect(statusFn).toHaveBeenCalledWith(400);
        const body = sendFn.mock.calls[0]?.[0] as unknown as {
          error: string;
          message: unknown;
        };
        expect(body.error).toBe(code);
        expect(typeof body.message).toBe('string');
      }
    });
  });
});
