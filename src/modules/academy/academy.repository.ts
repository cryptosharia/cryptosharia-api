import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, lte } from 'drizzle-orm';
import {
  academyCompletions,
  academyContent,
  academyGrants,
  academyLessonMedia,
  academyProgress,
  academyScopes,
} from '#src/modules/drizzle/drizzle.schema';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import type {
  AcademyCompletion,
  AcademyContent,
  AcademyGrant,
  AcademyLessonMedia,
  AcademyProgress,
  AcademyScope,
  DbExecutor,
} from '#src/modules/drizzle/drizzle.types';
import {
  ACADEMY_PLANNED_CHAPTERS,
  ACADEMY_PLANNED_LEVELS,
  ACADEMY_SUBJECTS,
  type AcademySubjectId,
} from './academy.constants';
import { AcademyError } from './academy.error';

export interface AggregateProgressSummary {
  completed: number;
  total: number;
  percentage: number;
}

@Injectable()
export class AcademyRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private getExecutor(executor?: DbExecutor): DbExecutor {
    return executor ?? this.drizzleService.db;
  }

  // --- Scope Operations ---

  async selectScopes(executor?: DbExecutor): Promise<AcademyScope[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyScopes)
      .where(eq(academyScopes.isActive, true))
      .orderBy(asc(academyScopes.name));
  }

  async selectScopeById(
    id: string,
    executor?: DbExecutor,
  ): Promise<AcademyScope | null> {
    const [scope] = await this.getExecutor(executor)
      .select()
      .from(academyScopes)
      .where(eq(academyScopes.id, id))
      .limit(1);
    return scope ?? null;
  }

  // --- Content & Curriculum Operations ---

  /**
   * Retrieves public published catalog lessons.
   * Structurally excludes private media / YouTube Video ID.
   */
  async selectPublishedCatalog(
    scopeId?: string,
    executor?: DbExecutor,
  ): Promise<AcademyContent[]> {
    const conditions = [
      eq(academyContent.status, 'published'),
      eq(academyContent.kind, 'lesson'),
    ];
    if (scopeId) {
      conditions.push(eq(academyContent.scopeId, scopeId));
    }

    return this.getExecutor(executor)
      .select()
      .from(academyContent)
      .where(and(...conditions))
      .orderBy(
        asc(academyContent.level),
        asc(academyContent.chapterNumber),
        asc(academyContent.order),
        asc(academyContent.id),
      );
  }

  /**
   * Retrieves all published curriculum hierarchy items (subjects, levels, chapters, lessons).
   */
  async selectPublishedCurriculum(
    executor?: DbExecutor,
  ): Promise<AcademyContent[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyContent)
      .where(eq(academyContent.status, 'published'))
      .orderBy(
        asc(academyContent.level),
        asc(academyContent.chapterNumber),
        asc(academyContent.order),
        asc(academyContent.id),
      );
  }

  async selectContentById(
    id: string,
    executor?: DbExecutor,
  ): Promise<AcademyContent | null> {
    const [item] = await this.getExecutor(executor)
      .select()
      .from(academyContent)
      .where(eq(academyContent.id, id))
      .limit(1);
    return item ?? null;
  }

  // --- Private Lesson Media ---

  async selectLessonMedia(
    lessonId: string,
    executor?: DbExecutor,
  ): Promise<AcademyLessonMedia | null> {
    const [media] = await this.getExecutor(executor)
      .select()
      .from(academyLessonMedia)
      .where(eq(academyLessonMedia.lessonId, lessonId))
      .limit(1);
    return media ?? null;
  }

  // --- Participant Grants (Entitlements) ---

  async selectUserGrants(
    userId: string,
    executor?: DbExecutor,
  ): Promise<AcademyGrant[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyGrants)
      .where(eq(academyGrants.userId, userId))
      .orderBy(desc(academyGrants.startsAt));
  }

  async selectActiveGrant(
    userId: string,
    scopeId: string,
    now: Date = new Date(),
    executor?: DbExecutor,
  ): Promise<AcademyGrant | null> {
    const [grant] = await this.getExecutor(executor)
      .select()
      .from(academyGrants)
      .where(
        and(
          eq(academyGrants.userId, userId),
          eq(academyGrants.scopeId, scopeId),
          eq(academyGrants.state, 'active'),
          lte(academyGrants.startsAt, now),
          gt(academyGrants.expiresAt, now),
        ),
      )
      .limit(1);
    return grant ?? null;
  }

  // --- Progress / Resume Positions ---

  async selectUserProgress(
    userId: string,
    executor?: DbExecutor,
  ): Promise<AcademyProgress[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyProgress)
      .where(eq(academyProgress.userId, userId))
      .orderBy(desc(academyProgress.updatedAt));
  }

  async upsertProgress(
    userId: string,
    lessonId: string,
    version: number,
    positionSeconds: number,
    executor?: DbExecutor,
  ): Promise<void> {
    await this.getExecutor(executor)
      .insert(academyProgress)
      .values({
        userId,
        lessonId,
        version,
        positionSeconds,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [academyProgress.userId, academyProgress.lessonId],
        set: {
          version,
          positionSeconds,
          updatedAt: new Date(),
        },
      });
  }

  // --- Completions ---

  async selectUserCompletions(
    userId: string,
    executor?: DbExecutor,
  ): Promise<AcademyCompletion[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyCompletions)
      .where(eq(academyCompletions.userId, userId))
      .orderBy(desc(academyCompletions.completedAt));
  }

  async insertCompletion(
    userId: string,
    lessonId: string,
    version: number,
    executor?: DbExecutor,
  ): Promise<void> {
    await this.getExecutor(executor)
      .insert(academyCompletions)
      .values({
        userId,
        lessonId,
        version,
        completedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // --- Domain Logic & Hierarchy Validation (Static / Unit Testable) ---

  /**
   * Validates structural invariants across curriculum items:
   * - 4 recognized subjects
   * - level in 1..6
   * - chapterNumber in 1..7
   * - order >= 0
   * - parent exists, published, and matches parent-child kind relationship
   * - no duplicate (parentId, order)
   */
  static validateHierarchyInvariants(items: AcademyContent[]): void {
    const byId = new Map(items.map((i) => [i.id, i]));
    const positions = new Set<string>();

    for (const item of items) {
      if (
        !ACADEMY_SUBJECTS.includes(item.subjectId as AcademySubjectId) ||
        !Number.isInteger(item.level) ||
        item.level < 1 ||
        item.level > ACADEMY_PLANNED_LEVELS ||
        !Number.isInteger(item.chapterNumber) ||
        item.chapterNumber < 1 ||
        item.chapterNumber > ACADEMY_PLANNED_CHAPTERS ||
        !Number.isInteger(item.order) ||
        item.order < 0
      ) {
        throw new AcademyError(
          'INVALID_CONTENT_HIERARCHY',
          `Nomor level, bab, urutan, atau subjek tidak valid pada item "${item.id}"`,
        );
      }

      const positionKey = `${item.parentId}_${item.order}`;
      if (positions.has(positionKey)) {
        throw new AcademyError(
          'DUPLICATE_CONTENT_ORDER',
          `Urutan urutan ganda pada posisi "${positionKey}"`,
        );
      }
      positions.add(positionKey);

      if (item.kind === 'subject') {
        if (item.id !== item.subjectId || item.parentId !== 'root') {
          throw new AcademyError(
            'INVALID_CONTENT_HIERARCHY',
            `Subjek "${item.id}" harus memiliki parentId 'root' dan id sama dengan subjectId`,
          );
        }
      } else {
        const parent = byId.get(item.parentId);
        const expectedParentKind: Record<string, string> = {
          level: 'subject',
          chapter: 'level',
          lesson: 'chapter',
        };

        if (
          !parent ||
          parent.status !== 'published' ||
          parent.kind !== expectedParentKind[item.kind] ||
          parent.subjectId !== item.subjectId ||
          (item.kind !== 'level' && parent.level !== item.level) ||
          (item.kind === 'lesson' && parent.chapterNumber !== item.chapterNumber)
        ) {
          throw new AcademyError(
            'INVALID_CONTENT_HIERARCHY',
            `Item "${item.id}" memiliki induk yang tidak valid, belum terbit, atau terputus`,
          );
        }
      }
    }
  }

  /**
   * Calculates aggregate learning progress.
   * Denominator: Published lessons covered by active grants at time `now`.
   * Numerator: Lessons where completion record matches the authoritative published version.
   */
  static calculateAggregateProgress(
    publishedLessons: AcademyContent[],
    completions: AcademyCompletion[],
    activeGrants: AcademyGrant[],
    now: Date = new Date(),
    scopeId?: string,
  ): AggregateProgressSummary {
    const nowTime = now.getTime();

    const activeScopes = new Set(
      activeGrants
        .filter(
          (g) =>
            g.state === 'active' &&
            new Date(g.startsAt).getTime() <= nowTime &&
            nowTime < new Date(g.expiresAt).getTime(),
        )
        .map((g) => g.scopeId),
    );

    const eligibleLessons = publishedLessons.filter(
      (l) =>
        l.kind === 'lesson' &&
        l.status === 'published' &&
        (!scopeId || l.scopeId === scopeId) &&
        l.scopeId !== null &&
        activeScopes.has(l.scopeId),
    );

    const eligibleMap = new Map(eligibleLessons.map((l) => [l.id, l]));

    const completedCount = completions.filter((c) => {
      const lesson = eligibleMap.get(c.lessonId);
      return lesson !== undefined && lesson.version === c.version;
    }).length;

    const total = eligibleMap.size;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      completed: completedCount,
      total,
      percentage,
    };
  }
}
