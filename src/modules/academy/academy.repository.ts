import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, type SQL } from 'drizzle-orm';
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

  /**
   * Asserts participant entitlement for a given scope at time `now`.
   * Enforces revocation precedence: overlapping or duplicate active grants
   * cannot silently defeat an existing revocation.
   */
  async validateEntitlement(
    userId: string,
    scopeId: string,
    now: Date = new Date(),
    executor?: DbExecutor,
  ): Promise<AcademyGrant> {
    const scope = await this.selectScopeById(scopeId, executor);
    if (!scope || !scope.isActive) {
      throw new AcademyError(
        'UNAUTHORIZED_SCOPE',
        'Lingkup materi tidak aktif atau tidak ditemukan',
      );
    }

    const grants = await this.getExecutor(executor)
      .select()
      .from(academyGrants)
      .where(
        and(
          eq(academyGrants.userId, userId),
          eq(academyGrants.scopeId, scopeId),
        ),
      )
      .orderBy(desc(academyGrants.createdAt), desc(academyGrants.updatedAt));

    if (grants.length === 0) {
      throw new AcademyError('GRANT_NOT_FOUND');
    }

    const nowMs = now.getTime();
    const revokedGrant = grants.find((g) => g.state === 'revoked');

    const validActiveGrant = grants.find((g) => {
      if (g.state !== 'active') return false;
      const startMs = new Date(g.startsAt).getTime();
      const expireMs = new Date(g.expiresAt).getTime();
      return startMs <= nowMs && nowMs < expireMs;
    });

    if (validActiveGrant) {
      const revokedTime = revokedGrant?.updatedAt
        ? new Date(revokedGrant.updatedAt).getTime()
        : 0;
      const activeCreatedTime = validActiveGrant.createdAt
        ? new Date(validActiveGrant.createdAt).getTime()
        : 0;

      if (revokedGrant && revokedTime >= activeCreatedTime) {
        throw new AcademyError('GRANT_REVOKED');
      }
      return validActiveGrant;
    }

    if (revokedGrant) {
      throw new AcademyError('GRANT_REVOKED');
    }

    const futureGrant = grants.find(
      (g) => g.state === 'active' && new Date(g.startsAt).getTime() > nowMs,
    );
    if (futureGrant) {
      throw new AcademyError('GRANT_NOT_STARTED');
    }

    const expiredGrant = grants.find(
      (g) => g.state === 'active' && new Date(g.expiresAt).getTime() <= nowMs,
    );
    if (expiredGrant) {
      throw new AcademyError('GRANT_EXPIRED');
    }

    throw new AcademyError('GRANT_INACTIVE');
  }

  async selectActiveGrant(
    userId: string,
    scopeId: string,
    now: Date = new Date(),
    executor?: DbExecutor,
  ): Promise<AcademyGrant | null> {
    try {
      return await this.validateEntitlement(userId, scopeId, now, executor);
    } catch {
      return null;
    }
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

    // Group grants by scope to enforce revocation precedence
    const grantsByScope = new Map<string, AcademyGrant[]>();
    for (const g of activeGrants) {
      const list = grantsByScope.get(g.scopeId) ?? [];
      list.push(g);
      grantsByScope.set(g.scopeId, list);
    }

    const activeScopes = new Set<string>();
    for (const [sId, sGrants] of grantsByScope.entries()) {
      const revoked = sGrants.find((g) => g.state === 'revoked');
      const active = sGrants.find(
        (g) =>
          g.state === 'active' &&
          new Date(g.startsAt).getTime() <= nowTime &&
          nowTime < new Date(g.expiresAt).getTime(),
      );

      if (active) {
        const revokedTime = revoked?.updatedAt
          ? new Date(revoked.updatedAt).getTime()
          : 0;
        const activeCreatedTime = active.createdAt
          ? new Date(active.createdAt).getTime()
          : 0;

        if (revoked && revokedTime >= activeCreatedTime) {
          // Revocation takes precedence over overlapping grant
          continue;
        }
        activeScopes.add(sId);
      }
    }

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

  // ==========================================
  // Admin Operations (Package 4 CMS)
  // ==========================================

  async insertScope(
    data: {
      id: string;
      name: string;
      description?: string;
      isActive?: boolean;
      createdBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyScope> {
    const [scope] = await this.getExecutor(executor)
      .insert(academyScopes)
      .values({
        id: data.id,
        name: data.name,
        description: data.description ?? '',
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return scope;
  }

  async updateScope(
    id: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
      updatedBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyScope> {
    const [scope] = await this.getExecutor(executor)
      .update(academyScopes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(academyScopes.id, id))
      .returning();
    if (!scope) {
      throw new AcademyError('SCOPE_NOT_FOUND', 'Scope tidak ditemukan');
    }
    return scope;
  }

  async selectAllScopesAdmin(executor?: DbExecutor): Promise<AcademyScope[]> {
    return this.getExecutor(executor)
      .select()
      .from(academyScopes)
      .orderBy(asc(academyScopes.name));
  }

  async selectAllContentAdmin(
    filters?: {
      status?: 'draft' | 'review' | 'approved' | 'published' | 'archived';
      kind?: 'subject' | 'level' | 'chapter' | 'lesson';
      subjectId?: 'fundamental' | 'technical' | 'muamalah' | 'web3';
      scopeId?: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyContent[]> {
    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(academyContent.status, filters.status));
    if (filters?.kind) conditions.push(eq(academyContent.kind, filters.kind));
    if (filters?.subjectId) conditions.push(eq(academyContent.subjectId, filters.subjectId));
    if (filters?.scopeId) conditions.push(eq(academyContent.scopeId, filters.scopeId));

    const q = this.getExecutor(executor).select().from(academyContent);
    if (conditions.length > 0) {
      q.where(and(...conditions));
    }

    return q.orderBy(
      asc(academyContent.level),
      asc(academyContent.chapterNumber),
      asc(academyContent.order),
      asc(academyContent.id),
    );
  }

  async insertContent(
    data: {
      id: string;
      kind: 'subject' | 'level' | 'chapter' | 'lesson';
      parentId: string;
      subjectId: 'fundamental' | 'technical' | 'muamalah' | 'web3';
      level: number;
      chapterNumber: number;
      order: number;
      scopeId?: string | null;
      title: string;
      description?: string;
      thumbnail?: string;
      durationSeconds?: number;
      instructor?: string;
      syariahRequired?: boolean;
      createdBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyContent> {
    const [item] = await this.getExecutor(executor)
      .insert(academyContent)
      .values({
        id: data.id,
        kind: data.kind,
        parentId: data.parentId,
        subjectId: data.subjectId,
        level: data.level,
        chapterNumber: data.chapterNumber,
        order: data.order,
        scopeId: data.scopeId ?? null,
        title: data.title,
        description: data.description ?? '',
        thumbnail: data.thumbnail ?? '/favicon.png',
        durationSeconds: data.durationSeconds ?? 0,
        instructor: data.instructor ?? '',
        status: 'draft',
        version: 1,
        syariahRequired: data.syariahRequired ?? false,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return item;
  }

  async updateContent(
    id: string,
    data: {
      title?: string;
      description?: string;
      thumbnail?: string;
      durationSeconds?: number;
      instructor?: string;
      order?: number;
      scopeId?: string | null;
      syariahRequired?: boolean;
      updatedBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyContent> {
    const [item] = await this.getExecutor(executor)
      .update(academyContent)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(academyContent.id, id))
      .returning();
    if (!item) {
      throw new AcademyError('CONTENT_NOT_FOUND', 'Konten tidak ditemukan');
    }
    return item;
  }

  async deleteContentDraft(id: string, executor?: DbExecutor): Promise<void> {
    const existing = await this.selectContentById(id, executor);
    if (!existing) {
      throw new AcademyError('CONTENT_NOT_FOUND', 'Konten tidak ditemukan');
    }
    if (existing.status !== 'draft') {
      throw new AcademyError(
        'INVALID_STATUS_TRANSITION',
        'Hanya konten berstatus draft yang dapat dihapus',
      );
    }
    await this.getExecutor(executor)
      .delete(academyContent)
      .where(eq(academyContent.id, id));
  }

  async transitionContentStatus(
    id: string,
    targetStatus: 'draft' | 'review' | 'approved' | 'published' | 'archived',
    actorUserId: string,
    rightsConfirmed: boolean = false,
    executor?: DbExecutor,
  ): Promise<AcademyContent> {
    const current = await this.selectContentById(id, executor);
    if (!current) {
      throw new AcademyError('CONTENT_NOT_FOUND', 'Konten tidak ditemukan');
    }

    const updates: Record<string, unknown> = {
      status: targetStatus,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    };

    if (targetStatus === 'approved') {
      updates.reviewedBy = actorUserId;
      updates.rightsConfirmed = rightsConfirmed;
      updates.approvedAt = new Date();
      if (current.syariahRequired) {
        updates.syariahReviewedBy = actorUserId;
      }
    } else if (targetStatus === 'published') {
      updates.publishedBy = actorUserId;
      updates.publishedAt = new Date();
    } else if (targetStatus === 'draft') {
      updates.reviewedBy = null;
      updates.syariahReviewedBy = null;
      updates.rightsConfirmed = false;
      updates.approvedAt = null;
      updates.publishedAt = null;
      updates.publishedBy = null;
    }

    const [updated] = await this.getExecutor(executor)
      .update(academyContent)
      .set(updates)
      .where(eq(academyContent.id, id))
      .returning();

    return updated;
  }

  async upsertLessonMedia(
    data: {
      lessonId: string;
      videoId: string;
      readingRefs?: string[];
      slideRefs?: string[];
      subtitleRefs?: string[];
      attachmentRefs?: string[];
      internalNote?: string | null;
      updatedBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyLessonMedia> {
    const [media] = await this.getExecutor(executor)
      .insert(academyLessonMedia)
      .values({
        lessonId: data.lessonId,
        videoId: data.videoId,
        readingRefs: data.readingRefs ?? [],
        slideRefs: data.slideRefs ?? [],
        subtitleRefs: data.subtitleRefs ?? [],
        attachmentRefs: data.attachmentRefs ?? [],
        internalNote: data.internalNote ?? null,
        createdBy: data.updatedBy,
        updatedBy: data.updatedBy,
      })
      .onConflictDoUpdate({
        target: [academyLessonMedia.lessonId],
        set: {
          videoId: data.videoId,
          readingRefs: data.readingRefs ?? [],
          slideRefs: data.slideRefs ?? [],
          subtitleRefs: data.subtitleRefs ?? [],
          attachmentRefs: data.attachmentRefs ?? [],
          internalNote: data.internalNote ?? null,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return media;
  }

  async insertGrant(
    data: {
      userId: string;
      scopeId: string;
      state?: 'active' | 'revoked';
      startsAt?: Date;
      expiresAt?: Date;
      source?: string;
      auditId?: string;
      createdBy: string;
    },
    executor?: DbExecutor,
  ): Promise<AcademyGrant> {
    const startsAt = data.startsAt ?? new Date();
    const expiresAt = data.expiresAt ?? new Date(Date.now() + 365 * 24 * 3600 * 1000);

    const [grant] = await this.getExecutor(executor)
      .insert(academyGrants)
      .values({
        userId: data.userId,
        scopeId: data.scopeId,
        state: data.state ?? 'active',
        startsAt,
        expiresAt,
        source: data.source ?? 'manual',
        auditId: data.auditId ?? null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return grant;
  }

  async revokeGrant(
    id: string,
    updatedBy: string,
    executor?: DbExecutor,
  ): Promise<AcademyGrant> {
    const [grant] = await this.getExecutor(executor)
      .update(academyGrants)
      .set({
        state: 'revoked',
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(academyGrants.id, id))
      .returning();
    if (!grant) {
      throw new AcademyError('GRANT_NOT_FOUND', 'Grant tidak ditemukan');
    }
    return grant;
  }

  async selectAllGrantsAdmin(
    filters?: { userId?: string; scopeId?: string },
    executor?: DbExecutor,
  ): Promise<AcademyGrant[]> {
    const conditions: SQL[] = [];
    if (filters?.userId) conditions.push(eq(academyGrants.userId, filters.userId));
    if (filters?.scopeId) conditions.push(eq(academyGrants.scopeId, filters.scopeId));

    const q = this.getExecutor(executor).select().from(academyGrants);
    if (conditions.length > 0) {
      q.where(and(...conditions));
    }
    return q.orderBy(desc(academyGrants.createdAt));
  }

  async selectAdminStats(executor?: DbExecutor): Promise<{
    totalLessons: number;
    publishedLessons: number;
    draftContent: number;
    reviewContent: number;
    totalScopes: number;
    totalGrants: number;
  }> {
    const allContent = await this.getExecutor(executor)
      .select({
        kind: academyContent.kind,
        status: academyContent.status,
      })
      .from(academyContent);

    const totalLessons = allContent.filter((c) => c.kind === 'lesson').length;
    const publishedLessons = allContent.filter(
      (c) => c.kind === 'lesson' && c.status === 'published',
    ).length;
    const draftContent = allContent.filter((c) => c.status === 'draft').length;
    const reviewContent = allContent.filter((c) => c.status === 'review').length;

    const scopes = await this.selectScopes(executor);
    const grants = await this.getExecutor(executor)
      .select({ id: academyGrants.id })
      .from(academyGrants)
      .where(eq(academyGrants.state, 'active'));

    return {
      totalLessons,
      publishedLessons,
      draftContent,
      reviewContent,
      totalScopes: scopes.length,
      totalGrants: grants.length,
    };
  }
}
