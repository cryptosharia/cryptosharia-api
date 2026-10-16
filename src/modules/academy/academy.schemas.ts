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
