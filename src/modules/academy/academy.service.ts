import { Injectable } from '@nestjs/common';
import type {
  AcademyCompletion,
  AcademyContent,
  AcademyLessonMedia,
  AcademyProgress,
  AcademyScope,
} from '#src/modules/drizzle/drizzle.types';
import { AcademyError } from './academy.error';
import {
  AcademyRepository,
  type AggregateProgressSummary,
} from './academy.repository';

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
   * Retrieves lesson details and delivers videoId ONLY after confirming active entitlement grant.
   */
  async getAuthorizedLessonMedia(
    userId: string,
    lessonId: string,
    now: Date = new Date(),
  ): Promise<AuthorizedLessonDetail> {
    const lesson = await this.repository.selectContentById(lessonId);
    if (!lesson) {
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

    const grant = await this.repository.selectActiveGrant(
      userId,
      lesson.scopeId,
      now,
    );
    if (!grant) {
      throw new AcademyError('UNAUTHORIZED_SCOPE');
    }

    const media = await this.repository.selectLessonMedia(lessonId);
    if (!media) {
      throw new AcademyError('MEDIA_NOT_FOUND');
    }

    return { lesson, media };
  }

  async getUserProgress(userId: string): Promise<AcademyProgress[]> {
    return this.repository.selectUserProgress(userId);
  }

  async recordProgress(
    userId: string,
    lessonId: string,
    version: number,
    positionSeconds: number,
  ): Promise<void> {
    const lesson = await this.repository.selectContentById(lessonId);
    if (!lesson || lesson.status !== 'published') {
      throw new AcademyError('LESSON_NOT_PUBLISHED');
    }

    if (
      !Number.isFinite(positionSeconds) ||
      positionSeconds < 0 ||
      positionSeconds > lesson.durationSeconds + 10
    ) {
      throw new AcademyError('INVALID_PROGRESS_POSITION');
    }

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

    const grant = await this.repository.selectActiveGrant(
      userId,
      lesson.scopeId,
      now,
    );
    if (!grant) {
      throw new AcademyError('UNAUTHORIZED_SCOPE');
    }

    await this.repository.insertCompletion(userId, lessonId, version);
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
}
