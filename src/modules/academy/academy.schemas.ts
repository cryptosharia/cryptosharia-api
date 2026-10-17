import { z } from 'zod';
import {
  AcademyCompletion,
  AcademyContent,
  AcademyGrant,
  AcademyProgress,
} from '#src/modules/drizzle/drizzle.types';

/**
 * Public catalog & curriculum item schema.
 * Strictly excludes private media (videoId), attachments, and internal editorial audit fields.
 */
export const AcademyCatalogItem = AcademyContent.pick({
  id: true,
  kind: true,
  parentId: true,
  subjectId: true,
  level: true,
  chapterNumber: true,
  order: true,
  scopeId: true,
  title: true,
  description: true,
  thumbnail: true,
  durationSeconds: true,
  instructor: true,
  status: true,
  version: true,
  publishedAt: true,
});
export type AcademyCatalogItem = z.infer<typeof AcademyCatalogItem>;

export const CatalogQuery = z.object({
  scopeId: z
    .string()
    .min(1, 'scopeId tidak boleh kosong')
    .optional()
    .meta({ description: 'Filter berdasarkan ID lingkup (scopeId)' }),
});
export type CatalogQuery = z.infer<typeof CatalogQuery>;

export const LessonIdParam = z.object({
  id: z
    .string()
    .min(1, 'ID pelajaran tidak boleh kosong')
    .meta({ description: 'ID materi pelajaran' }),
});
export type LessonIdParam = z.infer<typeof LessonIdParam>;

export const LessonIdRouteParam = z.object({
  lessonId: z
    .string()
    .min(1, 'ID pelajaran tidak boleh kosong')
    .meta({ description: 'ID materi pelajaran' }),
});
export type LessonIdRouteParam = z.infer<typeof LessonIdRouteParam>;

/**
 * Authorized lesson media delivered exclusively to entitled participants.
 */
export const AuthorizedLessonMedia = z.object({
  videoId: z
    .string()
    .length(11, 'YouTube Video ID harus berupa 11 karakter')
    .meta({
      description: 'YouTube Video ID 11 karakter',
      example: 'dQw4w9WgXcQ',
    }),
  version: z.number().int().meta({ description: 'Versi media video' }),
  readingRefs: z
    .array(z.string())
    .default([])
    .meta({ description: 'Referensi bacaan' }),
  slideRefs: z
    .array(z.string())
    .default([])
    .meta({ description: 'Referensi slide presentasi' }),
  subtitleRefs: z
    .array(z.string())
    .default([])
    .meta({ description: 'Referensi subtitle / transcript' }),
  attachmentRefs: z
    .array(z.string())
    .default([])
    .meta({ description: 'Referensi berkas lampiran pendukung' }),
});
export type AuthorizedLessonMedia = z.infer<typeof AuthorizedLessonMedia>;

export const AuthorizedLessonDetail = z.object({
  lesson: AcademyCatalogItem,
  media: AuthorizedLessonMedia,
});
export type AuthorizedLessonDetail = z.infer<typeof AuthorizedLessonDetail>;

/**
 * Participant entitlement / access grant schema.
 */
export const UserGrantItem = AcademyGrant.pick({
  id: true,
  userId: true,
  scopeId: true,
  state: true,
  startsAt: true,
  expiresAt: true,
  source: true,
  createdAt: true,
});
export type UserGrantItem = z.infer<typeof UserGrantItem>;

/**
 * User playback position schema.
 */
export const UserProgressItem = AcademyProgress.pick({
  userId: true,
  lessonId: true,
  version: true,
  positionSeconds: true,
  updatedAt: true,
});
export type UserProgressItem = z.infer<typeof UserProgressItem>;

export const ProgressUpdateBody = z.object({
  version: z
    .number()
    .int('Versi materi harus berupa bilangan bulat')
    .min(1, 'Versi minimal 1')
    .meta({ description: 'Versi materi pelajaran yang sedang diputar' }),
  positionSeconds: z
    .number()
    .int('Posisi video harus berupa bilangan bulat')
    .min(0, 'Posisi video tidak boleh negatif')
    .meta({ description: 'Posisi resume playback dalam detik' }),
});
export type ProgressUpdateBody = z.infer<typeof ProgressUpdateBody>;

/**
 * Completion schemas.
 */
export const CompletionCreateBody = z.object({
  version: z
    .number()
    .int('Versi materi harus berupa bilangan bulat')
    .min(1, 'Versi minimal 1')
    .meta({ description: 'Versi materi yang diselesaikan' }),
});
export type CompletionCreateBody = z.infer<typeof CompletionCreateBody>;

export const UserCompletionItem = AcademyCompletion.pick({
  userId: true,
  lessonId: true,
  version: true,
  completedAt: true,
});
export type UserCompletionItem = z.infer<typeof UserCompletionItem>;

export const AggregateProgressSummarySchema = z.object({
  completed: z
    .number()
    .int()
    .meta({ description: 'Jumlah pelajaran terselesaikan' }),
  total: z
    .number()
    .int()
    .meta({ description: 'Total pelajaran yang berhak diakses' }),
  percentage: z
    .number()
    .int()
    .meta({ description: 'Persentase progres belajar (0-100)' }),
});
export type AggregateProgressSummarySchema = z.infer<
  typeof AggregateProgressSummarySchema
>;

export const CompletionsResponse = z.object({
  completions: z.array(UserCompletionItem),
  summary: AggregateProgressSummarySchema,
});
export type CompletionsResponse = z.infer<typeof CompletionsResponse>;

// ==========================================
// Admin CMS & Editorial Schemas (Package 4)
// ==========================================

export const ScopeIdParam = z.object({
  id: z.string().min(1, 'ID lingkup tidak boleh kosong').max(50),
});
export type ScopeIdParam = z.infer<typeof ScopeIdParam>;

export const CreateScopeBody = z.object({
  id: z
    .string()
    .min(2, 'ID scope minimal 2 karakter')
    .max(50, 'ID scope maksimal 50 karakter')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Hanya huruf kecil, angka, dan tanda hubung'),
  name: z.string().min(2, 'Nama scope minimal 2 karakter').max(150),
  description: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});
export type CreateScopeBody = z.infer<typeof CreateScopeBody>;

export const UpdateScopeBody = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateScopeBody = z.infer<typeof UpdateScopeBody>;

export const AdminContentQuery = z.object({
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  kind: z.enum(['subject', 'level', 'chapter', 'lesson']).optional(),
  subjectId: z.enum(['fundamental', 'technical', 'muamalah', 'web3']).optional(),
  scopeId: z.string().optional(),
});
export type AdminContentQuery = z.infer<typeof AdminContentQuery>;

export const CreateContentBody = z.object({
  id: z
    .string()
    .min(2, 'ID konten minimal 2 karakter')
    .max(100, 'ID konten maksimal 100 karakter')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Hanya huruf kecil, angka, dan tanda hubung'),
  kind: z.enum(['subject', 'level', 'chapter', 'lesson']),
  parentId: z.string().min(1, 'parentId wajib diisi').max(100),
  subjectId: z.enum(['fundamental', 'technical', 'muamalah', 'web3']),
  level: z.number().int().min(1).max(6).default(1),
  chapterNumber: z.number().int().min(1).max(7).default(1),
  order: z.number().int().min(0).default(0),
  scopeId: z.string().max(50).nullable().optional(),
  title: z.string().min(2, 'Judul minimal 2 karakter').max(255),
  description: z.string().default(''),
  thumbnail: z.string().default('/favicon.png'),
  durationSeconds: z.number().int().min(0).default(0),
  instructor: z.string().max(150).default(''),
  syariahRequired: z.boolean().default(false),
});
export type CreateContentBody = z.infer<typeof CreateContentBody>;

export const UpdateContentBody = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  instructor: z.string().max(150).optional(),
  order: z.number().int().min(0).optional(),
  scopeId: z.string().max(50).nullable().optional(),
  syariahRequired: z.boolean().optional(),
});
export type UpdateContentBody = z.infer<typeof UpdateContentBody>;

export const ContentTransitionBody = z.object({
  targetStatus: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  rightsConfirmed: z.boolean().optional().default(false),
});
export type ContentTransitionBody = z.infer<typeof ContentTransitionBody>;

export const SetLessonMediaBody = z.object({
  videoId: z
    .string()
    .length(11, 'YouTube Video ID harus tepat 11 karakter')
    .meta({ example: 'dQw4w9WgXcQ' }),
  readingRefs: z.array(z.string()).default([]),
  slideRefs: z.array(z.string()).default([]),
  subtitleRefs: z.array(z.string()).default([]),
  attachmentRefs: z.array(z.string()).default([]),
  internalNote: z.string().nullable().optional(),
});
export type SetLessonMediaBody = z.infer<typeof SetLessonMediaBody>;

export const CreateGrantBody = z.object({
  userId: z.string().uuid('ID pengguna harus berupa format UUID yang valid'),
  scopeId: z.string().min(1, 'scopeId wajib diisi').max(50),
  state: z.enum(['active', 'revoked']).default('active'),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  source: z.string().max(50).default('manual'),
  auditId: z.string().max(100).optional(),
});
export type CreateGrantBody = z.infer<typeof CreateGrantBody>;

export const AdminDashboardStats = z.object({
  totalLessons: z.number().int(),
  publishedLessons: z.number().int(),
  draftContent: z.number().int(),
  reviewContent: z.number().int(),
  totalScopes: z.number().int(),
  totalGrants: z.number().int(),
});
export type AdminDashboardStats = z.infer<typeof AdminDashboardStats>;

export const ContentIdParam = z.object({
  id: z.string().min(1, 'ID konten wajib diisi').max(100),
});
export type ContentIdParam = z.infer<typeof ContentIdParam>;

export const GrantIdParam = z.object({
  id: z.string().uuid('ID grant harus berupa format UUID yang valid'),
});
export type GrantIdParam = z.infer<typeof GrantIdParam>;

export const AdminGrantsQuery = z.object({
  userId: z.string().uuid().optional(),
  scopeId: z.string().optional(),
});
export type AdminGrantsQuery = z.infer<typeof AdminGrantsQuery>;

