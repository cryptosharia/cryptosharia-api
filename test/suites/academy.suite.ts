import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import {
  academyContent,
  academyGrants,
  academyLessonMedia,
  academyScopes,
} from '#src/modules/drizzle/drizzle.schema';
import { Suite } from '#test/helpers/suite.base';
import { createSession as createSessionFor } from '#test/helpers/create-session';
import type { User } from '#src/modules/drizzle/drizzle.types';

type ApiErrorBody = { error: string };
type ApiSuccessBody = { success: boolean };
type AcademyContentItem = {
  id: string;
  kind: 'subject' | 'level' | 'chapter' | 'lesson';
  scopeId?: string | null;
  videoId?: string;
  internalNote?: string;
  readingRefs?: string[];
};
type AcademyLessonBody = {
  lesson: { id: string };
  media: {
    videoId: string;
    readingRefs: string[];
    internalNote?: string;
  };
};
type AcademyGrantItem = { userId: string; scopeId: string; state: string };
type AcademyProgressItem = {
  lessonId: string;
  positionSeconds: number;
};
type AcademyCompletionsBody = {
  completions: { lessonId: string; version: number }[];
  summary: { completed: number; total: number; percentage: number };
};

export class AcademySuite extends Suite {
  register() {
    const db = () => this.ctx.app.get(DrizzleService).db;
    const apiKey = process.env.API_KEY!;

    const createSession = (email: string, role: User['role'] = 'member') =>
      createSessionFor(this.ctx, email, role);

    const apiRequest = async <T = unknown>(
      path: string,
      options: {
        method?: string;
        token?: string;
        useApiKey?: boolean;
        body?: unknown;
        headers?: Record<string, string>;
      } = {},
    ) => {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...(options.headers ?? {}),
      };
      if (options.useApiKey !== false) {
        headers['api-key'] = apiKey;
      }
      if (options.token) {
        headers['authorization'] = `Bearer ${options.token}`;
      }

      const response = await fetch(`${this.ctx.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      let data: unknown = null;
      const text = await response.text();
      try {
        data = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        data = text;
      }

      return {
        status: response.status,
        data: data as T,
        headers: response.headers,
      };
    };

    describe('Academy Integration & Isolated Database Suite', () => {
      let entitledUser: User;
      let entitledToken: string;

      let secondUser: User;
      let secondToken: string;

      let expiredUser: User;
      let expiredToken: string;

      let revokedUser: User;
      let revokedToken: string;

      let futureUser: User;
      let futureToken: string;

      let overlappingRevokedUser: User;
      let overlappingRevokedToken: string;

      let noGrantToken: string;

      beforeEach(async () => {
        // Setup synthetic users
        const u1 = await createSession('entitled@test.local');
        entitledUser = u1.user;
        entitledToken = u1.accessToken;

        const u2 = await createSession('second@test.local');
        secondUser = u2.user;
        secondToken = u2.accessToken;

        const uExp = await createSession('expired@test.local');
        expiredUser = uExp.user;
        expiredToken = uExp.accessToken;

        const uRev = await createSession('revoked@test.local');
        revokedUser = uRev.user;
        revokedToken = uRev.accessToken;

        const uFut = await createSession('future@test.local');
        futureUser = uFut.user;
        futureToken = uFut.accessToken;

        const uOver = await createSession('overlapping@test.local');
        overlappingRevokedUser = uOver.user;
        overlappingRevokedToken = uOver.accessToken;

        const uNone = await createSession('nogrant@test.local');
        noGrantToken = uNone.accessToken;

        // Seed scopes
        await db()
          .insert(academyScopes)
          .values([
            {
              id: 'scope-a',
              name: 'Paket Dasar',
              description: 'Akses kursus dasar',
              isActive: true,
            },
            {
              id: 'scope-inactive',
              name: 'Paket Tidak Aktif',
              description: 'Akses tidak aktif',
              isActive: false,
            },
          ]);

        // Seed curriculum hierarchy
        const now = new Date();
        await db()
          .insert(academyContent)
          .values([
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
              description: 'Subjek fundamental',
              status: 'published',
              version: 1,
              publishedAt: now,
            },
            {
              id: 'fundamental-l1',
              kind: 'level',
              parentId: 'fundamental',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 1,
              scopeId: 'scope-a',
              title: 'Tingkat 1',
              status: 'published',
              version: 1,
              publishedAt: now,
            },
            {
              id: 'fundamental-l1-c1',
              kind: 'chapter',
              parentId: 'fundamental-l1',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 1,
              scopeId: 'scope-a',
              title: 'Bab 1',
              status: 'published',
              version: 1,
              publishedAt: now,
            },
            {
              id: 'lesson-1',
              kind: 'lesson',
              parentId: 'fundamental-l1-c1',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 1,
              scopeId: 'scope-a',
              title: 'Pelajaran 1: Pengantar',
              description: 'Materi pengantar',
              durationSeconds: 600,
              status: 'published',
              version: 1,
              publishedAt: now,
            },
            {
              id: 'lesson-2',
              kind: 'lesson',
              parentId: 'fundamental-l1-c1',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 2,
              scopeId: 'scope-a',
              title: 'Pelajaran 2: Lanjutan',
              description: 'Materi lanjutan',
              durationSeconds: 400,
              status: 'published',
              version: 1,
              publishedAt: now,
            },
            {
              id: 'lesson-draft',
              kind: 'lesson',
              parentId: 'fundamental-l1-c1',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 3,
              scopeId: 'scope-a',
              title: 'Pelajaran Draft',
              description: 'Materi draft',
              durationSeconds: 300,
              status: 'draft',
              version: 1,
            },
            {
              id: 'lesson-inactive-scope',
              kind: 'lesson',
              parentId: 'fundamental-l1-c1',
              subjectId: 'fundamental',
              level: 1,
              chapterNumber: 1,
              order: 4,
              scopeId: 'scope-inactive',
              title: 'Pelajaran Scope Inactive',
              description: 'Scope nonaktif',
              durationSeconds: 300,
              status: 'published',
              version: 1,
              publishedAt: now,
            },
          ]);

        // Seed media
        await db()
          .insert(academyLessonMedia)
          .values([
            {
              lessonId: 'lesson-1',
              videoId: 'dQw4w9WgXcQ',
              version: 1,
              readingRefs: ['https://ref.example.com/p1'],
              slideRefs: ['https://ref.example.com/slides1'],
              internalNote: 'Internal editorial note for lesson 1',
            },
            {
              lessonId: 'lesson-2',
              videoId: 'oHg5SJYRHA0',
              version: 1,
              internalNote: 'Internal editorial note for lesson 2',
            },
            {
              lessonId: 'lesson-draft',
              videoId: 'draftVideo1',
              version: 1,
              internalNote: 'Draft notes',
            },
            {
              lessonId: 'lesson-inactive-scope',
              videoId: 'inactiveV11',
              version: 1,
            },
          ]);

        // Seed grants
        const yesterday = new Date(Date.now() - 86400 * 1000);
        const lastMonth = new Date(Date.now() - 30 * 86400 * 1000);
        const nextMonth = new Date(Date.now() + 30 * 86400 * 1000);
        const nextWeek = new Date(Date.now() + 7 * 86400 * 1000);
        const nextYear = new Date(Date.now() + 365 * 86400 * 1000);

        await db()
          .insert(academyGrants)
          .values([
            // Entitled users
            {
              userId: entitledUser.id,
              scopeId: 'scope-a',
              state: 'active',
              startsAt: yesterday,
              expiresAt: nextMonth,
              source: 'manual',
            },
            {
              userId: secondUser.id,
              scopeId: 'scope-a',
              state: 'active',
              startsAt: yesterday,
              expiresAt: nextMonth,
              source: 'manual',
            },
            // Expired user
            {
              userId: expiredUser.id,
              scopeId: 'scope-a',
              state: 'active',
              startsAt: lastMonth,
              expiresAt: yesterday,
              source: 'manual',
            },
            // Revoked user
            {
              userId: revokedUser.id,
              scopeId: 'scope-a',
              state: 'revoked',
              startsAt: lastMonth,
              expiresAt: nextMonth,
              source: 'manual',
            },
            // Future user
            {
              userId: futureUser.id,
              scopeId: 'scope-a',
              state: 'active',
              startsAt: nextWeek,
              expiresAt: nextYear,
              source: 'manual',
            },
            // Overlapping grants with revocation:
            // 1. Older active grant
            {
              userId: overlappingRevokedUser.id,
              scopeId: 'scope-a',
              state: 'active',
              startsAt: lastMonth,
              expiresAt: nextMonth,
              source: 'manual',
              createdAt: lastMonth,
              updatedAt: lastMonth,
            },
            // 2. Revoked grant issued afterwards
            {
              userId: overlappingRevokedUser.id,
              scopeId: 'scope-a',
              state: 'revoked',
              startsAt: yesterday,
              expiresAt: nextMonth,
              source: 'manual',
              createdAt: yesterday,
              updatedAt: yesterday,
            },
          ]);
      });

      describe('Security Boundaries (Guards & Headers)', () => {
        it('rejects anonymous access without API key', async () => {
          const res = await apiRequest('/academy/catalog', {
            useApiKey: false,
          });
          expect(res.status).toBe(401);
        });

        it('rejects protected routes without Bearer token', async () => {
          const res = await apiRequest('/academy/lessons/lesson-1');
          expect(res.status).toBe(401);
        });

        it('rejects protected routes with invalid Bearer token', async () => {
          const res = await apiRequest('/academy/lessons/lesson-1', {
            token: 'invalid.jwt.token',
          });
          expect(res.status).toBe(401);
        });
      });

      describe('Public Catalog & Curriculum', () => {
        it('returns published lesson catalog without videoId or private fields', async () => {
          const res =
            await apiRequest<AcademyContentItem[]>('/academy/catalog');
          expect(res.status).toBe(200);
          expect(Array.isArray(res.data)).toBe(true);

          // Only published lessons
          const ids = res.data.map((item) => item.id);
          expect(ids).toContain('lesson-1');
          expect(ids).toContain('lesson-2');
          expect(ids).not.toContain('lesson-draft');

          // Strict absence of private videoId and editorial notes
          for (const item of res.data) {
            expect(item.videoId).toBeUndefined();
            expect(item.internalNote).toBeUndefined();
            expect(item.readingRefs).toBeUndefined();
          }
        });

        it('filters catalog by scopeId correctly', async () => {
          const res = await apiRequest<AcademyContentItem[]>(
            '/academy/catalog?scopeId=scope-a',
          );
          expect(res.status).toBe(200);
          expect(res.data.every((item) => item.scopeId === 'scope-a')).toBe(
            true,
          );
        });

        it('returns structural curriculum tree hierarchy', async () => {
          const res = await apiRequest<AcademyContentItem[]>(
            '/academy/curriculum',
          );
          expect(res.status).toBe(200);
          expect(Array.isArray(res.data)).toBe(true);

          const kinds = res.data.map((item) => item.kind);
          expect(kinds).toContain('subject');
          expect(kinds).toContain('level');
          expect(kinds).toContain('chapter');
          expect(kinds).toContain('lesson');

          // Ensure drafts are excluded
          expect(
            res.data.find((item) => item.id === 'lesson-draft'),
          ).toBeUndefined();
          // Ensure private media is omitted
          expect(res.data.every((item) => item.videoId === undefined)).toBe(
            true,
          );
        });
      });

      describe('Authorized Lesson Delivery (Entitlements)', () => {
        it('delivers 11-character videoId for active entitled participant', async () => {
          const res = await apiRequest<AcademyLessonBody>(
            '/academy/lessons/lesson-1',
            {
              token: entitledToken,
            },
          );
          expect(res.status).toBe(200);
          expect(res.data.lesson.id).toBe('lesson-1');
          expect(res.data.media.videoId).toBe('dQw4w9WgXcQ');
          expect(res.data.media.videoId).toHaveLength(11);
          expect(res.data.media.readingRefs).toEqual([
            'https://ref.example.com/p1',
          ]);
          // Internal editorial note is omitted
          expect(res.data.media.internalNote).toBeUndefined();
        });

        it('denies access when participant has no grant', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-1',
            {
              token: noGrantToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_NOT_FOUND');
        });

        it('denies access when participant grant has expired', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-1',
            {
              token: expiredToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_EXPIRED');
        });

        it('denies access when participant grant has not started (future)', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-1',
            {
              token: futureToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_NOT_STARTED');
        });

        it('denies access when participant grant is revoked', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-1',
            {
              token: revokedToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_REVOKED');
        });

        it('denies access when overlapping active and revoked grants exist (revocation precedence)', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-1',
            {
              token: overlappingRevokedToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_REVOKED');
        });

        it('denies access when lesson belongs to an inactive scope', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-inactive-scope',
            {
              token: entitledToken,
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('UNAUTHORIZED_SCOPE');
        });

        it('returns 404 for draft / unpublished lessons', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/lessons/lesson-draft',
            {
              token: entitledToken,
            },
          );
          expect(res.status).toBe(404);
          expect(res.data.error).toBe('LESSON_NOT_PUBLISHED');
        });
      });

      describe('Participant Grants', () => {
        it('returns current user grants with appropriate state information', async () => {
          const res = await apiRequest<AcademyGrantItem[]>(
            '/academy/me/grants',
            {
              token: entitledToken,
            },
          );
          expect(res.status).toBe(200);
          expect(Array.isArray(res.data)).toBe(true);
          expect(res.data).toHaveLength(1);
          expect(res.data[0].scopeId).toBe('scope-a');
          expect(res.data[0].state).toBe('active');
          expect(res.data[0].userId).toBe(entitledUser.id);
        });
      });

      describe('Progress / Resume Tracking', () => {
        it('saves and loads bounded playback position', async () => {
          const saveRes = await apiRequest<ApiSuccessBody>(
            '/academy/me/progress/lesson-1',
            {
              method: 'PUT',
              token: entitledToken,
              body: { version: 1, positionSeconds: 150 },
            },
          );
          expect(saveRes.status).toBe(200);
          expect(saveRes.data.success).toBe(true);

          const getRes = await apiRequest<AcademyProgressItem[]>(
            '/academy/me/progress',
            {
              token: entitledToken,
            },
          );
          expect(getRes.status).toBe(200);
          expect(getRes.data).toHaveLength(1);
          expect(getRes.data[0].lessonId).toBe('lesson-1');
          expect(getRes.data[0].positionSeconds).toBe(150);
        });

        it('rejects position beyond valid lesson duration', async () => {
          // lesson-1 duration is 600s, position 900s exceeds 600 + 10s
          const res = await apiRequest<ApiErrorBody>(
            '/academy/me/progress/lesson-1',
            {
              method: 'PUT',
              token: entitledToken,
              body: { version: 1, positionSeconds: 900 },
            },
          );
          expect(res.status).toBe(400);
          expect(res.data.error).toBe('INVALID_PROGRESS_POSITION');
        });

        it('rejects progress updates after access has been revoked', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/me/progress/lesson-1',
            {
              method: 'PUT',
              token: revokedToken,
              body: { version: 1, positionSeconds: 100 },
            },
          );
          expect(res.status).toBe(403);
          expect(res.data.error).toBe('GRANT_REVOKED');
        });

        it('enforces cross-user progress isolation', async () => {
          // Entitled user updates progress
          await apiRequest('/academy/me/progress/lesson-1', {
            method: 'PUT',
            token: entitledToken,
            body: { version: 1, positionSeconds: 200 },
          });

          // Second user views progress
          const secondRes = await apiRequest<AcademyProgressItem[]>(
            '/academy/me/progress',
            {
              token: secondToken,
            },
          );
          expect(secondRes.status).toBe(200);
          expect(secondRes.data).toHaveLength(0);
        });
      });

      describe('Lesson Completions & Aggregate Progress', () => {
        it('marks lesson complete idempotently and derives aggregate progress', async () => {
          // Mark lesson-1 complete
          const completeRes1 = await apiRequest<ApiSuccessBody>(
            '/academy/me/completions/lesson-1',
            {
              method: 'POST',
              token: entitledToken,
              body: { version: 1 },
            },
          );
          expect(completeRes1.status).toBe(200);
          expect(completeRes1.data.success).toBe(true);

          // Mark lesson-1 complete a second time (idempotent duplicate completion)
          const completeResDuplicate = await apiRequest<ApiSuccessBody>(
            '/academy/me/completions/lesson-1',
            {
              method: 'POST',
              token: entitledToken,
              body: { version: 1 },
            },
          );
          expect(completeResDuplicate.status).toBe(200);

          // Retrieve completions and progress
          const getRes = await apiRequest<AcademyCompletionsBody>(
            '/academy/me/completions',
            {
              token: entitledToken,
            },
          );
          expect(getRes.status).toBe(200);
          expect(getRes.data.completions).toHaveLength(1);
          expect(getRes.data.completions[0].lessonId).toBe('lesson-1');
          expect(getRes.data.completions[0].version).toBe(1);

          // Total eligible published lessons in scope-a is 2 (lesson-1 and lesson-2)
          // Completed: 1, percentage: 50%
          expect(getRes.data.summary).toEqual({
            completed: 1,
            total: 2,
            percentage: 50,
          });
        });

        it('rejects completion with stale or mismatched version', async () => {
          const res = await apiRequest<ApiErrorBody>(
            '/academy/me/completions/lesson-1',
            {
              method: 'POST',
              token: entitledToken,
              body: { version: 99 },
            },
          );
          expect(res.status).toBe(400);
          expect(res.data.error).toBe('COMPLETION_VERSION_MISMATCH');
        });

        it('handles concurrent completion requests safely without double-counting', async () => {
          // Concurrently send 5 requests to complete lesson-2
          const responses = await Promise.all(
            Array.from({ length: 5 }, () =>
              apiRequest('/academy/me/completions/lesson-2', {
                method: 'POST',
                token: entitledToken,
                body: { version: 1 },
              }),
            ),
          );

          // All should return 200
          for (const res of responses) {
            expect(res.status).toBe(200);
          }

          // Verify total completions in database
          const getRes = await apiRequest<AcademyCompletionsBody>(
            '/academy/me/completions',
            {
              token: entitledToken,
            },
          );
          expect(getRes.status).toBe(200);
          // Only lesson-2 (or lesson-1 + lesson-2)
          const lesson2Completions = getRes.data.completions.filter(
            (completion) => completion.lessonId === 'lesson-2',
          );
          expect(lesson2Completions).toHaveLength(1);
        });

        it('completion does not modify playback position', async () => {
          // Set progress to 75s
          await apiRequest('/academy/me/progress/lesson-1', {
            method: 'PUT',
            token: entitledToken,
            body: { version: 1, positionSeconds: 75 },
          });

          // Mark complete
          await apiRequest('/academy/me/completions/lesson-1', {
            method: 'POST',
            token: entitledToken,
            body: { version: 1 },
          });

          // Verify progress is still 75s
          const progRes = await apiRequest<AcademyProgressItem[]>(
            '/academy/me/progress',
            {
              token: entitledToken,
            },
          );
          const p1 = progRes.data.find(
            (progress) => progress.lessonId === 'lesson-1',
          );
          expect(p1?.positionSeconds).toBe(75);
        });

        it('enforces cross-user completion isolation', async () => {
          // Entitled user completed lesson-1
          await apiRequest('/academy/me/completions/lesson-1', {
            method: 'POST',
            token: entitledToken,
            body: { version: 1 },
          });

          // Second user checks completions
          const secondRes = await apiRequest<AcademyCompletionsBody>(
            '/academy/me/completions',
            {
              token: secondToken,
            },
          );
          expect(secondRes.status).toBe(200);
          expect(secondRes.data.completions).toHaveLength(0);
          expect(secondRes.data.summary).toEqual({
            completed: 0,
            total: 2,
            percentage: 0,
          });
        });
      });
    });
  }
}
