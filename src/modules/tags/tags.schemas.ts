import { z } from 'zod';
import { AuditMetadata } from '#src/modules/audit/audit.schemas';
import { tagContentSectionEnum } from '#src/modules/drizzle/drizzle.schema';
import { Tag } from '#src/modules/drizzle/drizzle.types';

export const TagIdentifier = z
  .union([Tag.shape.id, Tag.shape.slug])
  .meta({ description: 'ID atau slug tag', example: 'halal-crypto' });

export const TagResponse = Tag.omit({
  createdBy: true,
  updatedBy: true,
}).extend(AuditMetadata.shape);
export type TagResponse = z.infer<typeof TagResponse>;

export const TagParam = z.object({ identifier: TagIdentifier });
export type TagParam = z.infer<typeof TagParam>;

export const TagIdParam = z.object({
  id: Tag.shape.id.meta({ description: 'ID tag' }),
});
export type TagIdParam = z.infer<typeof TagIdParam>;

export const TagsQuery = z.object({
  page: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .default(1)
    .meta({
      description: 'Halaman',
    }),
  limit: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .max(100, 'Maksimal 100')
    .default(20)
    .meta({
      description: 'Item per halaman',
    }),
  search: z.string().trim().max(255, 'Maksimal 255 karakter').optional().meta({
    description:
      'Cari berdasarkan nama, slug, atau deskripsi tag (case-insensitive)',
    example: 'halal',
  }),
  slugs: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z
      .array(Tag.shape.slug)
      .optional()
      .meta({
        description: 'Filter berdasarkan slug tag',
        example: ['halal-crypto'],
      }),
  ),
  contentSections: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z
      .array(z.enum(tagContentSectionEnum.enumValues))
      .optional()
      .meta({
        description: 'Filter berdasarkan seksi konten publik',
        example: ['news'],
      }),
  ),
  showInNavigation: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z
      .boolean()
      .optional()
      .meta({ description: 'Filter tag yang tampil di navigasi publik' }),
  ),
  sortBy: z
    .enum(['name', 'slug', 'description', 'showInNavigation'])
    .optional()
    .default('name')
    .meta({
      description: 'Kolom pengurutan tag',
      example: 'name',
    }),
  sortDirection: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .meta({ description: 'Arah pengurutan', example: 'asc' }),
});
export type TagsQuery = z.infer<typeof TagsQuery>;

export const TagCreateBody = Tag.pick({
  name: true,
  slug: true,
  description: true,
  contentSection: true,
  showInNavigation: true,
  displayOrder: true,
});
export type TagCreateBody = z.infer<typeof TagCreateBody>;

export const TagUpdateBody = TagCreateBody.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Minimal satu field wajib diisi' },
);
export type TagUpdateBody = z.infer<typeof TagUpdateBody>;

export const TagDeleteQuery = z.object({
  force: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().default(false).meta({
      description: 'Hapus tag meskipun masih digunakan',
    }),
  ),
});
export type TagDeleteQuery = z.infer<typeof TagDeleteQuery>;

export const TagInUseDetails = {
  usage: z
    .object({
      posts: z
        .number()
        .int('Harus berupa bilangan bulat')
        .nonnegative('Harus berupa angka non-negatif')
        .meta({ description: 'Jumlah post yang memakai tag' }),
      cryptoassets: z
        .number()
        .int('Harus berupa bilangan bulat')
        .nonnegative('Harus berupa angka non-negatif')
        .meta({ description: 'Jumlah cryptoasset yang memakai tag' }),
    })
    .meta({ description: 'Referensi yang menghalangi penghapusan' }),
};
