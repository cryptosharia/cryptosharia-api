import { describe, expect, it, vi } from 'vitest';
import type {
  AcademyCompletion,
  AcademyContent,
  AcademyGrant,
  AcademyLessonMedia,
} from '#src/modules/drizzle/drizzle.types';
import {
  AcademyRepository,
  type AggregateProgressSummary,
} from './academy.repository';
import { AcademyService } from './academy.service';
import { AcademyError } from './academy.error';

describe('Academy Domain & Hierarchy Invariants', () => {
  const createSubject = (id: 'fundamental'): AcademyContent => ({
    id,
    kind: 'subject',
    parentId: 'root',
    subjectId: id,
    level: 1,
    chapterNumber: 1,
    order: 0,
    scopeId: null,
    title: 'Analisis Fundamental',
    description: 'Deskripsi subjek',
    thumbnail: '/favicon.png',
    durationSeconds: 0,
    instructor: '',
    status: 'published',
    version: 1,
    syariahRequired: false,
    reviewedBy: null,
    syariahReviewedBy: null,
    rightsConfirmed: true,
    approvedAt: new Date(),
    publishedAt: new Date(),
    publishedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
  });

  const createLevel = (subject: AcademyContent, levelNum: number): AcademyContent => ({
    ...createSubject('fundamental'),
    id: `${subject.id}-l${levelNum}`,
    kind: 'level',
    parentId: subject.id,
    level: levelNum,
    order: levelNum,
    title: `Level ${levelNum}`,
  });

  const createChapter = (
    level: AcademyContent,
    chapNum: number,
  ): AcademyContent => ({
    ...createSubject('fundamental'),
    id: `${level.id}-c${chapNum}`,
    kind: 'chapter',
    parentId: level.id,
    level: level.level,
    chapterNumber: chapNum,
    order: chapNum,
    title: `Bab ${chapNum}`,
  });

  const createLesson = (
    chapter: AcademyContent,
    order: number,
    scopeId = 'scope-a',
    status: 'draft' | 'published' = 'published',
    version = 1,
  ): AcademyContent => ({
    ...createSubject('fundamental'),
    id: `${chapter.id}-lesson-${order}`,
    kind: 'lesson',
    parentId: chapter.id,
    level: chapter.level,
    chapterNumber: chapter.chapterNumber,
    order,
    scopeId,
    title: `Pelajaran ${order}`,
    durationSeconds: 600,
    status,
    version,
  });

  it('validates a correct 4-tier hierarchy without throwing', () => {
    const subject = createSubject('fundamental');
    const level1 = createLevel(subject, 1);
    const chapter1 = createChapter(level1, 1);
    const lesson1 = createLesson(chapter1, 1);
    const lesson2 = createLesson(chapter1, 2);

    expect(() =>
      AcademyRepository.validateHierarchyInvariants([
        subject,
        level1,
        chapter1,
        lesson1,
        lesson2,
      ]),
    ).not.toThrow();
  });

  it('rejects invalid level numbers out of 1..6 bounds', () => {
    const subject = createSubject('fundamental');
    const level7 = { ...createLevel(subject, 7), level: 7 };

    expect(() =>
      AcademyRepository.validateHierarchyInvariants([subject, level7]),
    ).toThrowError(/Nomor level, bab, urutan, atau subjek tidak valid/);
  });

  it('rejects duplicate orders under the same parent', () => {
    const subject = createSubject('fundamental');
    const level1 = createLevel(subject, 1);
    const chapter1 = createChapter(level1, 1);
    const lesson1 = createLesson(chapter1, 1);
    const lesson1Duplicate = { ...createLesson(chapter1, 1), id: 'lesson-dup' };

    expect(() =>
      AcademyRepository.validateHierarchyInvariants([
        subject,
        level1,
        chapter1,
        lesson1,
        lesson1Duplicate,
      ]),
    ).toThrowError(/Urutan urutan ganda pada posisi/);
  });

  it('rejects lessons with orphaned or unpublished parents', () => {
    const subject = createSubject('fundamental');
    const level1 = { ...createLevel(subject, 1), status: 'draft' as const };
    const chapter1 = createChapter(level1, 1);
    const lesson1 = createLesson(chapter1, 1);

    expect(() =>
      AcademyRepository.validateHierarchyInvariants([
        subject,
        level1,
        chapter1,
        lesson1,
      ]),
    ).toThrowError(/memiliki induk yang tidak valid, belum terbit, atau terputus/);
  });
});

describe('Aggregate Progress Calculation', () => {
  const now = new Date('2026-10-14T20:00:00Z');

  const createDummyLesson = (id: string, scopeId = 'scope-a', version = 1): AcademyContent => ({
    id,
    kind: 'lesson',
    parentId: 'chapter-1',
    subjectId: 'fundamental',
    level: 1,
    chapterNumber: 1,
    order: 1,
    scopeId,
    title: `Lesson ${id}`,
    description: '',
    thumbnail: '',
    durationSeconds: 300,
    instructor: '',
    status: 'published',
    version,
    syariahRequired: false,
    reviewedBy: null,
    syariahReviewedBy: null,
    rightsConfirmed: true,
    approvedAt: now,
    publishedAt: now,
    publishedBy: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  });

  const activeGrant: AcademyGrant = {
    id: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    scopeId: 'scope-a',
    state: 'active',
    startsAt: new Date('2026-10-01T00:00:00Z'),
    expiresAt: new Date('2026-12-31T23:59:59Z'),
    source: 'manual',
    auditId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  it('calculates 0% when user has no active grants', () => {
    const lessons = [createDummyLesson('l1'), createDummyLesson('l2')];
    const completions: AcademyCompletion[] = [
      {
        userId: 'u1',
        lessonId: 'l1',
        version: 1,
        completedAt: now,
      },
    ];

    const result = AcademyRepository.calculateAggregateProgress(
      lessons,
      completions,
      [], // no grants
      now,
    );

    expect(result).toEqual({ completed: 0, total: 0, percentage: 0 });
  });

  it('calculates exact partial completion for eligible active scope lessons', () => {
    const lessons = [
      createDummyLesson('l1'),
      createDummyLesson('l2'),
      createDummyLesson('l3'),
      createDummyLesson('l4'),
    ];

    const completions: AcademyCompletion[] = [
      { userId: 'u1', lessonId: 'l1', version: 1, completedAt: now },
      { userId: 'u1', lessonId: 'l2', version: 1, completedAt: now },
    ];

    const result = AcademyRepository.calculateAggregateProgress(
      lessons,
      completions,
      [activeGrant],
      now,
    );

    expect(result).toEqual({ completed: 2, total: 4, percentage: 50 });
  });

  it('ignores historical completions where published version has updated', () => {
    // Lesson l1 was updated to version 2; user completion was for version 1
    const lessons = [createDummyLesson('l1', 'scope-a', 2)];
    const completions: AcademyCompletion[] = [
      { userId: 'u1', lessonId: 'l1', version: 1, completedAt: now },
    ];

    const result = AcademyRepository.calculateAggregateProgress(
      lessons,
      completions,
      [activeGrant],
      now,
    );

    expect(result).toEqual({ completed: 0, total: 1, percentage: 0 });
  });
});

describe('AcademyService Entitlement & Progress Guard', () => {
  const mockRepo = {
    selectContentById: vi.fn(),
    selectActiveGrant: vi.fn(),
    selectLessonMedia: vi.fn(),
    selectUserProgress: vi.fn(),
    upsertProgress: vi.fn(),
    selectUserCompletions: vi.fn(),
    insertCompletion: vi.fn(),
  };

  const service = new AcademyService(mockRepo as unknown as AcademyRepository);

  it('delivers media only when lesson is published and grant is active', async () => {
    const lesson: AcademyContent = {
      id: 'l1',
      kind: 'lesson',
      parentId: 'c1',
      subjectId: 'fundamental',
      level: 1,
      chapterNumber: 1,
      order: 1,
      scopeId: 'scope-a',
      title: 'Materi 1',
      description: '',
      thumbnail: '',
      durationSeconds: 300,
      instructor: '',
      status: 'published',
      version: 1,
      syariahRequired: false,
      reviewedBy: null,
      syariahReviewedBy: null,
      rightsConfirmed: true,
      approvedAt: new Date(),
      publishedAt: new Date(),
      publishedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    };

    const media: AcademyLessonMedia = {
      lessonId: 'l1',
      videoId: 'dQw4w9WgXcQ',
      version: 1,
      readingRefs: [],
      slideRefs: [],
      subtitleRefs: [],
      attachmentRefs: [],
      internalNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    };

    mockRepo.selectContentById.mockResolvedValue(lesson);
    mockRepo.selectActiveGrant.mockResolvedValue({ id: 'grant-1' });
    mockRepo.selectLessonMedia.mockResolvedValue(media);

    const result = await service.getAuthorizedLessonMedia('user-1', 'l1');
    expect(result.media.videoId).toBe('dQw4w9WgXcQ');
  });

  it('rejects media retrieval with UNAUTHORIZED_SCOPE when grant is absent', async () => {
    mockRepo.selectContentById.mockResolvedValue({
      id: 'l1',
      status: 'published',
      scopeId: 'scope-a',
    });
    mockRepo.selectActiveGrant.mockResolvedValue(null);

    await expect(
      service.getAuthorizedLessonMedia('user-1', 'l1'),
    ).rejects.toThrow(AcademyError);
  });

  it('rejects completion when supplied version mismatches published version', async () => {
    mockRepo.selectContentById.mockResolvedValue({
      id: 'l1',
      status: 'published',
      version: 2,
      scopeId: 'scope-a',
    });

    await expect(
      service.markLessonComplete('user-1', 'l1', 1),
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'COMPLETION_VERSION_MISMATCH' }),
    );
  });
});
