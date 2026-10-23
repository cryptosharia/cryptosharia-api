import './academy-test-env';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import type { AddressInfo } from 'node:net';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { StorageService } from '#src/modules/storage/storage.service';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { MarketDataService } from '#src/modules/market-data/market-data.service';
import { TestMailerService } from '#test/helpers/test-mailer.service';
import { TestStorageService } from '#test/helpers/test-storage.service';
import { TestImageProviderService } from '#test/helpers/test-image-provider.service';
import { TestMarketDataService } from '#test/helpers/test-market-data.service';
import { CryptoService } from '#src/modules/crypto/crypto.service';
import { ACCESS_TOKEN_ISSUER } from '#src/modules/auth/auth.constants';
import { AppModule } from '../../app.module';
import { DrizzleService } from '../drizzle/drizzle.service';
import {
  users,
  academyContent,
  academyGrants,
  academyProgress,
  academyCompletions,
  academyScopes,
} from '../drizzle/drizzle.schema';
import { eq } from 'drizzle-orm';

const TEST_API_KEY = process.env.API_KEY || 'test-bff-api-key-academy-qa-2026';
process.env.RESEND_FROM = 'CryptoSharia <test@example.com>';
process.env.RESEND_REPLY_TO = 'support@example.com';
process.env.CONTACT_FORM_TO_EMAIL = 'support@example.com';

describe('Package 4B CMS Integration & Security Suite (Isolated QA Neon Branch)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;
  let adminToken: string;
  let staffAdminToken: string;
  let studentToken1: string;
  let studentToken2: string;
  let postsManagerToken: string;

  const studentUser1Id = '11111111-1111-4111-a111-111111111111';
  const studentUser2Id = '22222222-2222-4222-a222-222222222222';
  const testScopeSlug = `qa-scope-${Date.now().toString(36)}`;
  const lessonSlug = `qa-lesson-${Date.now().toString(36)}`;
  const leakDraftId = `qa-leak-${Date.now().toString(36)}`;
  const validVideoId = 'dQw4w9WgXcQ';
  let grantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useClass(TestMailerService)
      .overrideProvider(StorageService)
      .useClass(TestStorageService)
      .overrideProvider(ImageProviderService)
      .useClass(TestImageProviderService)
      .overrideProvider(MarketDataService)
      .useClass(TestMarketDataService)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(multipart, {
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    });
    await app.init();
    await app.listen(0);

    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;

    const cryptoService = app.get(CryptoService);
    const signToken = (userId: string, role: string) =>
      cryptoService.signJwt(
        { sub: userId, role },
        { issuer: ACCESS_TOKEN_ISSUER, expiresIn: 3600 },
      );

    adminToken = await signToken(
      '25f4507b-7908-458c-a07b-edae1f0e107a',
      'super_admin',
    );
    staffAdminToken = await signToken(
      '25f4507b-7908-458c-a07b-edae1f0e107a',
      'admin',
    );
    studentToken1 = await signToken(studentUser1Id, 'member');
    studentToken2 = await signToken(studentUser2Id, 'member');
    postsManagerToken = await signToken(studentUser1Id, 'posts_manager');

    const drizzleService = app.get(DrizzleService);

    // Clean up test data for idempotent runs
    await drizzleService.db.delete(academyProgress);
    await drizzleService.db.delete(academyCompletions);
    await drizzleService.db.delete(academyGrants);
    await drizzleService.db
      .delete(academyContent)
      .where(eq(academyContent.kind, 'lesson'));

    await drizzleService.db
      .insert(users)
      .values([
        {
          id: '25f4507b-7908-458c-a07b-edae1f0e107a',
          email: 'qa.admin@test.local',
          name: 'QA Admin',
          role: 'super_admin',
          status: 'active',
        },
        {
          id: studentUser1Id,
          email: 'qa.student1@test.local',
          name: 'QA Student 1',
          role: 'member',
          status: 'active',
        },
        {
          id: studentUser2Id,
          email: 'qa.student2@test.local',
          name: 'QA Student 2',
          role: 'member',
          status: 'active',
        },
      ])
      .onConflictDoNothing();

    await drizzleService.db
      .insert(academyContent)
      .values([
        {
          id: 'fundamental',
          kind: 'subject',
          parentId: 'root',
          subjectId: 'fundamental',
          order: 0,
          title: 'Fundamental',
          status: 'published',
        },
        {
          id: 'fundamental-l1',
          kind: 'level',
          parentId: 'fundamental',
          subjectId: 'fundamental',
          level: 1,
          order: 1,
          title: 'Level 1',
          status: 'published',
        },
        {
          id: 'fundamental-l1-c1',
          kind: 'chapter',
          parentId: 'fundamental-l1',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          title: 'Chapter 1',
          status: 'published',
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    if (app) {
      try {
        const drizzleService = app.get(DrizzleService);
        await drizzleService.db.delete(academyProgress);
        await drizzleService.db.delete(academyCompletions);
        await drizzleService.db.delete(academyGrants);
        await drizzleService.db
          .delete(academyContent)
          .where(eq(academyContent.kind, 'lesson'));
      } catch {}
      await app.close();
    }
  });

  const request = async (
    path: string,
    options: {
      method?: string;
      token?: string;
      apiKey?: string | null;
      body?: unknown;
    } = {},
  ) => {
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (options.apiKey !== null) {
      headers['api-key'] = options.apiKey ?? TEST_API_KEY;
    }
    if (options.token) {
      headers['authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let data: any = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      console.log(
        `[HTTP ${res.status}] ${options.method ?? 'GET'} ${path}:`,
        data,
      );
    }
    return { status: res.status, ok: res.ok, data };
  };

  describe('Security & RBAC Enforcement', () => {
    it('rejects direct API calls without API Key (401)', async () => {
      const res = await request('/academy/admin/stats', { apiKey: null });
      expect(res.status).toBe(401);
    });

    it('rejects admin endpoints without Bearer token (401)', async () => {
      const res = await request('/academy/admin/stats');
      expect(res.status).toBe(401);
    });

    it('rejects admin mutations without Bearer token (401)', async () => {
      const res = await request('/academy/admin/scopes', {
        method: 'POST',
        body: { id: 'unauth-scope', name: 'Unauth Scope' },
      });
      expect(res.status).toBe(401);
    });

    it('forbids regular member token from accessing admin stats (403)', async () => {
      const res = await request('/academy/admin/stats', {
        token: studentToken1,
      });
      expect(res.status).toBe(403);
    });

    it('forbids regular member token from creating content (403)', async () => {
      const res = await request('/academy/admin/content', {
        method: 'POST',
        token: studentToken1,
        body: { title: 'Unauthorized Content' },
      });
      expect(res.status).toBe(403);
    });

    it('forbids regular member token from creating scopes (403)', async () => {
      const res = await request('/academy/admin/scopes', {
        method: 'POST',
        token: studentToken1,
        body: { id: 'member-scope', name: 'Member Scope' },
      });
      expect(res.status).toBe(403);
    });

    it('forbids regular member token from creating grants (403)', async () => {
      const res = await request('/academy/admin/grants', {
        method: 'POST',
        token: studentToken1,
        body: { userId: studentUser1Id, scopeId: 'dummy-scope' },
      });
      expect(res.status).toBe(403);
    });

    it('forbids regular member token from revoking grants (403)', async () => {
      const res = await request('/academy/admin/grants/dummy-grant-id/revoke', {
        method: 'PUT',
        token: studentToken1,
      });
      expect(res.status).toBe(403);
    });

    it('forbids non-academy staff role (posts_manager) from accessing admin endpoints (403)', async () => {
      const res = await request('/academy/admin/stats', {
        token: postsManagerToken,
      });
      expect(res.status).toBe(403);
    });

    it('allows super_admin role to retrieve admin stats (200)', async () => {
      const res = await request('/academy/admin/stats', { token: adminToken });
      expect(res.status).toBe(200);
      expect(typeof res.data.totalLessons).toBe('number');
      expect(typeof res.data.totalScopes).toBe('number');
    });

    it('allows admin role to retrieve admin stats (200)', async () => {
      const res = await request('/academy/admin/stats', {
        token: staffAdminToken,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Scope Management CRUD', () => {
    it('creates scope with valid slug (201 Created)', async () => {
      const res = await request('/academy/admin/scopes', {
        method: 'POST',
        token: adminToken,
        body: {
          id: testScopeSlug,
          name: 'QA Test Scope 2026',
          description: 'Scope pengujian otomatis Package 4B',
          isActive: true,
        },
      });
      expect(res.status).toBe(201);
      expect(res.data.id).toBe(testScopeSlug);
      expect(res.data.name).toBe('QA Test Scope 2026');
    });

    it('rejects duplicate scope ID (4xx)', async () => {
      const res = await request('/academy/admin/scopes', {
        method: 'POST',
        token: adminToken,
        body: {
          id: testScopeSlug,
          name: 'Duplicate Scope',
        },
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('lists scopes and contains newly created scope (200)', async () => {
      const res = await request('/academy/admin/scopes', { token: adminToken });
      expect(res.status).toBe(200);
      const found = res.data.find((s: any) => s.id === testScopeSlug);
      expect(found).toBeDefined();
    });

    it('updates scope metadata (200)', async () => {
      const res = await request(`/academy/admin/scopes/${testScopeSlug}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          name: 'Updated QA Scope Name',
          description: 'Deskripsi diperbarui',
        },
      });
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Updated QA Scope Name');
    });
  });

  describe('Curriculum Hierarchy & Validation Invariants', () => {
    it('rejects subject with parentId other than root (400)', async () => {
      const res = await request('/academy/admin/content', {
        method: 'POST',
        token: adminToken,
        body: {
          id: 'fundamental-bad',
          kind: 'subject',
          parentId: 'wrong-parent',
          subjectId: 'fundamental',
          title: 'Subject Test',
        },
      });
      expect(res.status).toBe(400);
    });

    it('rejects lesson under invalid parent kind (400)', async () => {
      const res = await request('/academy/admin/content', {
        method: 'POST',
        token: adminToken,
        body: {
          id: 'bad-lesson-parent',
          kind: 'lesson',
          parentId: 'fundamental',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 99,
          title: 'Invalid Lesson Parent',
        },
      });
      expect(res.status).toBe(400);
    });

    it('creates lesson draft under chapter (201)', async () => {
      const res = await request('/academy/admin/content', {
        method: 'POST',
        token: adminToken,
        body: {
          id: lessonSlug,
          kind: 'lesson',
          parentId: 'fundamental-l1-c1',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 1,
          scopeId: testScopeSlug,
          title: 'Pelajaran QA: Siklus Pasar Kripto',
          description: 'Materi pengujian alur publikasi Package 4B',
          durationSeconds: 900,
          instructor: 'Ustadz Ahli Muamalah',
          syariahRequired: true,
        },
      });
      expect(res.status).toBe(201);
      expect(res.data.status).toBe('draft');
      expect(res.data.id).toBe(lessonSlug);
    });
  });

  describe('Media Management & Validation', () => {
    it('rejects videoId with invalid length (400 or 422)', async () => {
      const res = await request(`/academy/admin/content/${lessonSlug}/media`, {
        method: 'PUT',
        token: adminToken,
        body: { videoId: 'invalid' },
      });
      expect([400, 422]).toContain(res.status);
    });

    it('attaches valid 11-char YouTube media to lesson (200)', async () => {
      const res = await request(`/academy/admin/content/${lessonSlug}/media`, {
        method: 'PUT',
        token: adminToken,
        body: {
          videoId: validVideoId,
          readingRefs: ['https://cryptosharia.id/article/siklus-pasar'],
          slideRefs: ['https://cryptosharia.id/slides/fundamental-1.pdf'],
          internalNote: 'Telah diaudit oleh tim kurikulum',
        },
      });
      expect(res.status).toBe(200);
      expect(res.data.videoId).toBe(validVideoId);
    });
  });

  describe('Editorial & Sharia Review Workflow', () => {
    it('rejects illegal direct transition draft -> published (400)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'published' },
        },
      );
      expect(res.status).toBe(400);
    });

    it('transitions draft -> review (200)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'review' },
        },
      );
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('review');
    });

    it('rejects review -> approved when rightsConfirmed is false (400)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'approved', rightsConfirmed: false },
        },
      );
      expect(res.status).toBe(400);
    });

    it('approves review -> approved with rightsConfirmed: true (200)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'approved', rightsConfirmed: true },
        },
      );
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('approved');
      expect(res.data.rightsConfirmed).toBe(true);
    });

    it('publishes approved -> published and records publishedAt (200)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'published' },
        },
      );
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('published');
      expect(res.data.publishedAt).toBeDefined();
    });
  });

  describe('Public Catalog & Leak Prevention', () => {
    beforeAll(async () => {
      await request('/academy/admin/content', {
        method: 'POST',
        token: adminToken,
        body: {
          id: leakDraftId,
          kind: 'lesson',
          parentId: 'fundamental-l1-c1',
          subjectId: 'fundamental',
          level: 1,
          chapterNumber: 1,
          order: 2,
          scopeId: testScopeSlug,
          title: 'Unpublished Secret Draft',
        },
      });
    });

    it('includes published lesson in catalog and NEVER includes draft', async () => {
      const res = await request('/academy/catalog');
      expect(res.status).toBe(200);
      const catalog = res.data;
      const hasPublished = catalog.some((c: any) => c.id === lessonSlug);
      const hasDraft = catalog.some((c: any) => c.id === leakDraftId);

      expect(hasPublished).toBe(true);
      expect(hasDraft).toBe(false);
    });

    it('structurally omits videoId from public catalog items', async () => {
      const res = await request('/academy/catalog');
      const item = res.data.find((c: any) => c.id === lessonSlug);
      expect(item).toBeDefined();
      expect(item.videoId).toBeUndefined();
    });
  });

  describe('Student Grants & Entitlement Access', () => {
    it('blocks student without grant from accessing lesson (403 UNAUTHORIZED_SCOPE)', async () => {
      const res = await request(`/academy/lessons/${lessonSlug}`, {
        token: studentToken1,
      });
      expect(res.status).toBe(403);
    });

    it('admin allocates grant to student 1 (201)', async () => {
      const res = await request('/academy/admin/grants', {
        method: 'POST',
        token: adminToken,
        body: {
          userId: studentUser1Id,
          scopeId: testScopeSlug,
          source: 'qa_automated_test',
        },
      });
      expect(res.status).toBe(201);
      expect(res.data.state).toBe('active');
      grantId = res.data.id;
    });

    it('entitled student 1 accesses lesson and receives videoId (200)', async () => {
      const res = await request(`/academy/lessons/${lessonSlug}`, {
        token: studentToken1,
      });
      expect(res.status).toBe(200);
      expect(res.data.media?.videoId).toBe(validVideoId);
    });

    it('student 2 without grant remains forbidden (403)', async () => {
      const res = await request(`/academy/lessons/${lessonSlug}`, {
        token: studentToken2,
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Learning Progress & Completion Tracking', () => {
    it('records playback position at 120s (200)', async () => {
      const res = await request(`/academy/me/progress/${lessonSlug}`, {
        method: 'PUT',
        token: studentToken1,
        body: { version: 1, positionSeconds: 120 },
      });
      expect(res.status).toBe(200);
      expect(res.data.positionSeconds).toBe(120);
    });

    it('marks lesson complete (200)', async () => {
      const res = await request(`/academy/me/completions/${lessonSlug}`, {
        method: 'POST',
        token: studentToken1,
        body: { version: 1 },
      });
      expect(res.status).toBe(200);
    });

    it('calculates aggregate progress with completions (200)', async () => {
      const res = await request('/academy/me/completions', {
        token: studentToken1,
      });
      expect(res.status).toBe(200);
      expect(res.data.completions.length).toBeGreaterThanOrEqual(1);
      expect(res.data.summary.completed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Grant Revocation & Access Cutoff', () => {
    it('revokes student grant (200)', async () => {
      const res = await request(`/academy/admin/grants/${grantId}/revoke`, {
        method: 'PUT',
        token: adminToken,
      });
      expect(res.status).toBe(200);
      expect(res.data.state).toBe('revoked');
    });

    it('immediately blocks student 1 from lesson media after revocation (403)', async () => {
      const res = await request(`/academy/lessons/${lessonSlug}`, {
        token: studentToken1,
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Archiving & Draft Deletion Cleanup', () => {
    it('archives published lesson (200)', async () => {
      const res = await request(
        `/academy/admin/content/${lessonSlug}/transition`,
        {
          method: 'POST',
          token: adminToken,
          body: { targetStatus: 'archived' },
        },
      );
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('archived');
    });

    it('rejects deleting non-draft (archived) content (400)', async () => {
      const res = await request(`/academy/admin/content/${lessonSlug}`, {
        method: 'DELETE',
        token: adminToken,
      });
      expect(res.status).toBe(400);
    });

    it('successfully deletes a draft lesson (204)', async () => {
      const res = await request(`/academy/admin/content/${leakDraftId}`, {
        method: 'DELETE',
        token: adminToken,
      });
      expect([200, 204]).toContain(res.status);
    });
  });
});
