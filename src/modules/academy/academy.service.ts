import { Injectable } from '@nestjs/common';
import type {
  AcademyCompletion,
  AcademyContent,
  AcademyGrant,
  AcademyLessonMedia,
  AcademyProgress,
  AcademyScope,
} from '#src/modules/drizzle/drizzle.types';
import { AcademyError } from './academy.error';
import {
  AcademyRepository,
  type AggregateProgressSummary,
} from './academy.repository';
import type {
  AdminContentQuery,
  CreateContentBody,
  CreateGrantBody,
  CreateScopeBody,
  SetLessonMediaBody,
  UpdateContentBody,
  UpdateScopeBody,
} from './academy.schemas';

export interface AuthorizedLessonDetail {
  lesson: AcademyContent;
  media: AcademyLessonMedia;
}

@Injectable()
export class AcademyService {
  constructor(private readonly repository: AcademyRepository) {}

  async getScopes(): Promise<AcademyScope[]> {
    return this.repository.selectScopes();
  }

  async getCatalog(scopeId?: string): Promise<AcademyContent[]> {
    return this.repository.selectPublishedCatalog(scopeId);
  }

  async getCurriculum(): Promise<AcademyContent[]> {
    return this.repository.selectPublishedCurriculum();
  }

  /**
   * Asserts participant has valid, active, non-revoked entitlement.
   */
  private async assertEntitlement(
    userId: string,
    scopeId: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (typeof this.repository.validateEntitlement === 'function') {
      await this.repository.validateEntitlement(userId, scopeId, now);
    } else {
      const grant = await this.repository.selectActiveGrant(
        userId,
        scopeId,
        now,
      );
      if (!grant) {
        throw new AcademyError('UNAUTHORIZED_SCOPE');
      }
    }
  }

  /**
   * Retrieves lesson details and delivers videoId ONLY after confirming active entitlement grant.
   */
  async getAuthorizedLessonMedia(
    userId: string,
    lessonId: string,
    now: Date = new Date(),
  ): Promise<AuthorizedLessonDetail> {
    const lesson = await this.repository.selectContentById(lessonId);
    if (!lesson || lesson.kind !== 'lesson') {
      throw new AcademyError('CONTENT_NOT_FOUND');
    }
    if (lesson.status !== 'published') {
      throw new AcademyError('LESSON_NOT_PUBLISHED');
    }
    if (!lesson.scopeId) {
      throw new AcademyError(
        'UNAUTHORIZED_SCOPE',
        'Materi belum diasosiasikan dengan lingkup akses yang valid',
      );
    }

    await this.assertEntitlement(userId, lesson.scopeId, now);

    const media = await this.repository.selectLessonMedia(lessonId);
    if (!media) {
      throw new AcademyError('MEDIA_NOT_FOUND');
    }

    return { lesson, media };
  }

  async getUserGrants(userId: string): Promise<AcademyGrant[]> {
    return this.repository.selectUserGrants(userId);
  }

  async getUserProgress(userId: string): Promise<AcademyProgress[]> {
    return this.repository.selectUserProgress(userId);
  }

  async recordProgress(
    userId: string,
    lessonId: string,
    version: number,
    positionSeconds: number,
    now: Date = new Date(),
  ): Promise<void> {
    const lesson = await this.repository.selectContentById(lessonId);
    if (!lesson || lesson.status !== 'published') {
      throw new AcademyError('LESSON_NOT_PUBLISHED');
    }
    if (lesson.version !== version) {
      throw new AcademyError('COMPLETION_VERSION_MISMATCH');
    }

    if (
      !Number.isFinite(positionSeconds) ||
      positionSeconds < 0 ||
      positionSeconds > lesson.durationSeconds + 10
    ) {
      throw new AcademyError('INVALID_PROGRESS_POSITION');
    }

    if (!lesson.scopeId) {
      throw new AcademyError('UNAUTHORIZED_SCOPE');
    }

    await this.assertEntitlement(userId, lesson.scopeId, now);

    await this.repository.upsertProgress(
      userId,
      lessonId,
      version,
      Math.floor(positionSeconds),
    );
  }

  async getUserCompletions(userId: string): Promise<AcademyCompletion[]> {
    return this.repository.selectUserCompletions(userId);
  }

  async markLessonComplete(
    userId: string,
    lessonId: string,
    version: number,
    now: Date = new Date(),
  ): Promise<void> {
    const lesson = await this.repository.selectContentById(lessonId);
    if (!lesson || lesson.status !== 'published') {
      throw new AcademyError('LESSON_NOT_PUBLISHED');
    }
    if (lesson.version !== version) {
      throw new AcademyError('COMPLETION_VERSION_MISMATCH');
    }
    if (!lesson.scopeId) {
      throw new AcademyError('UNAUTHORIZED_SCOPE');
    }

    await this.assertEntitlement(userId, lesson.scopeId, now);

    await this.repository.insertCompletion(userId, lessonId, version);
  }

  async getCompletionsWithSummary(
    userId: string,
    scopeId?: string,
    now: Date = new Date(),
  ): Promise<{
    completions: AcademyCompletion[];
    summary: AggregateProgressSummary;
  }> {
    const [completions, summary] = await Promise.all([
      this.repository.selectUserCompletions(userId),
      this.getAggregateProgress(userId, scopeId, now),
    ]);
    return { completions, summary };
  }

  async getAggregateProgress(
    userId: string,
    scopeId?: string,
    now: Date = new Date(),
  ): Promise<AggregateProgressSummary> {
    const [publishedLessons, completions, grants] = await Promise.all([
      this.repository.selectPublishedCatalog(scopeId),
      this.repository.selectUserCompletions(userId),
      this.repository.selectUserGrants(userId),
    ]);

    return AcademyRepository.calculateAggregateProgress(
      publishedLessons,
      completions,
      grants,
      now,
      scopeId,
    );
  }

  // ==========================================
  // Admin CMS & Editorial Operations (Package 4)
  // ==========================================

  async getAdminStats() {
    return this.repository.selectAdminStats();
  }

  async getAdminScopes(): Promise<AcademyScope[]> {
    return this.repository.selectAllScopesAdmin();
  }

  async createScope(
    data: CreateScopeBody & { createdBy: string },
  ): Promise<AcademyScope> {
    return this.repository.insertScope(data);
  }

  async updateScope(
    id: string,
    data: UpdateScopeBody & { updatedBy: string },
  ): Promise<AcademyScope> {
    return this.repository.updateScope(id, data);
  }

  async getAdminContent(
    filters?: AdminContentQuery,
  ): Promise<AcademyContent[]> {
    return this.repository.selectAllContentAdmin(filters);
  }

  async getContentById(id: string): Promise<AcademyContent> {
    const item = await this.repository.selectContentById(id);
    if (!item) {
      throw new AcademyError('CONTENT_NOT_FOUND');
    }
    return item;
  }

  async createContent(
    data: CreateContentBody & { createdBy: string },
  ): Promise<AcademyContent> {
    // Validate parent relationship
    if (data.kind === 'subject') {
      if (data.parentId !== 'root' || data.id !== data.subjectId) {
        throw new AcademyError(
          'INVALID_CONTENT_HIERARCHY',
          `Subjek "${data.id}" harus memiliki parentId 'root' dan id sama dengan subjectId`,
        );
      }
    } else {
      const parent = await this.repository.selectContentById(data.parentId);
      if (!parent) {
        throw new AcademyError(
          'INVALID_CONTENT_HIERARCHY',
          `Induk konten "${data.parentId}" tidak ditemukan`,
        );
      }
      const expectedParentKind: Record<string, string> = {
        level: 'subject',
        chapter: 'level',
        lesson: 'chapter',
      };
      if (parent.kind !== expectedParentKind[data.kind]) {
        throw new AcademyError(
          'INVALID_CONTENT_HIERARCHY',
          `Tipe induk tidak sesuai: ${data.kind} harus berada di bawah ${expectedParentKind[data.kind]}`,
        );
      }
    }

    return this.repository.insertContent(data);
  }

  async updateContent(
    id: string,
    data: UpdateContentBody & { updatedBy: string },
  ): Promise<AcademyContent> {
    return this.repository.updateContent(id, data);
  }

  async deleteContentDraft(id: string): Promise<void> {
    return this.repository.deleteContentDraft(id);
  }

  async transitionContentStatus(
    id: string,
    targetStatus: 'draft' | 'review' | 'approved' | 'published' | 'archived',
    actorUserId: string,
    rightsConfirmed: boolean = false,
  ): Promise<AcademyContent> {
    const current = await this.getContentById(id);

    const validTransitions: Record<string, string[]> = {
      draft: ['review'],
      review: ['approved', 'draft'],
      approved: ['published', 'draft'],
      published: ['archived'],
      archived: ['draft'],
    };

    if (current.status !== targetStatus) {
      const allowed = validTransitions[current.status] ?? [];
      if (!allowed.includes(targetStatus)) {
        throw new AcademyError(
          'INVALID_STATUS_TRANSITION',
          `Transisi status dari "${current.status}" ke "${targetStatus}" tidak diizinkan`,
        );
      }
    }

    if (targetStatus === 'approved' && !rightsConfirmed) {
      throw new AcademyError(
        'RIGHTS_NOT_CONFIRMED',
        'Pernyataan kesesuaian syariah dan hak materi wajib dicentang untuk menyetujui',
      );
    }

    if (targetStatus === 'published' && current.kind === 'lesson') {
      const media = await this.repository.selectLessonMedia(id);
      if (!media || !media.videoId) {
        throw new AcademyError(
          'MEDIA_NOT_FOUND',
          'Materi video belum dikonfigurasi. Daftarkan video YouTube terlebih dahulu sebelum memublikasikan materi.',
        );
      }
    }

    return this.repository.transitionContentStatus(
      id,
      targetStatus,
      actorUserId,
      rightsConfirmed,
    );
  }

  async setLessonMedia(
    lessonId: string,
    data: SetLessonMediaBody & { updatedBy: string },
  ): Promise<AcademyLessonMedia> {
    const lesson = await this.getContentById(lessonId);
    if (lesson.kind !== 'lesson') {
      throw new AcademyError(
        'INVALID_CONTENT_HIERARCHY',
        'Media hanya dapat dikaitkan dengan konten berjenis lesson',
      );
    }
    return this.repository.upsertLessonMedia({
      lessonId,
      videoId: data.videoId,
      readingRefs: data.readingRefs,
      slideRefs: data.slideRefs,
      subtitleRefs: data.subtitleRefs,
      attachmentRefs: data.attachmentRefs,
      internalNote: data.internalNote,
      updatedBy: data.updatedBy,
    });
  }

  async getAdminGrants(filters?: {
    userId?: string;
    scopeId?: string;
  }): Promise<AcademyGrant[]> {
    return this.repository.selectAllGrantsAdmin(filters);
  }

  async createGrant(
    data: CreateGrantBody & { createdBy: string },
  ): Promise<AcademyGrant> {
    return this.repository.insertGrant({
      userId: data.userId,
      scopeId: data.scopeId,
      state: data.state,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      source: data.source,
      auditId: data.auditId,
      createdBy: data.createdBy,
    });
  }

  async revokeGrant(id: string, updatedBy: string): Promise<AcademyGrant> {
    return this.repository.revokeGrant(id, updatedBy);
  }
}

