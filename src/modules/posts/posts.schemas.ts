import { z } from 'zod';
import { AssetMetadata } from '#src/modules/assets/assets.schemas';
import { AuditMetadata } from '#src/modules/audit/audit.schemas';
import { Post, Tag } from '#src/modules/drizzle/drizzle.types';

export const PostTagItem = Tag.pick({ id: true, name: true, slug: true });
export type PostTagItem = z.infer<typeof PostTagItem>;

export const PostTagDetail = Tag.pick({
  id: true,
  name: true,
  slug: true,
  description: true,
});
export type PostTagDetail = z.infer<typeof PostTagDetail>;

export const PostListItem = Post.omit({
  content: true,
  coverImageId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    coverImage: AssetMetadata.nullable(),
    tags: z.array(PostTagItem),
  })
  .extend(AuditMetadata.shape);
export type PostListItem = z.infer<typeof PostListItem>;

export const PostDetail = Post.omit({
  coverImageId: true,
  createdBy: true,
  updatedBy: true,
})
  .extend({
    coverImage: AssetMetadata.nullable(),
    tags: z.array(PostTagDetail),
  })
  .extend(AuditMetadata.shape);
export type PostDetail = z.infer<typeof PostDetail>;

export const PostIdentifier = z.union([Post.shape.id, Post.shape.slug]).meta({
  description: 'ID atau slug post',
});

export const PostParam = z.object({ identifier: PostIdentifier });
export type PostParam = z.infer<typeof PostParam>;

export const PostIdParam = z.object({
  id: Post.shape.id.meta({ description: 'ID post' }),
});
export type PostIdParam = z.infer<typeof PostIdParam>;

export const PostsQuery = z.object({
  page: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .default(1)
    .meta({ description: 'Halaman' }),
  limit: z.coerce
    .number()
    .int('Harus berupa bilangan bulat')
    .min(1, 'Minimal 1')
    .max(100, 'Maksimal 100')
    .default(20)
    .meta({ description: 'Item per halaman' }),
  search: z.string().trim().max(255, 'Maksimal 255 karakter').optional().meta({
    description: 'Cari berdasarkan judul, slug, ringkasan, atau konten',
    example: 'halal',
  }),
  statuses: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Post.shape.status).optional().meta({
      description: 'Filter berdasarkan status publikasi',
    }),
  ),
  sections: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Post.shape.section).optional().meta({
      description: 'Filter berdasarkan kategori post',
    }),
  ),
  types: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Post.shape.type).optional().meta({
      description: 'Filter berdasarkan tipe konten',
    }),
  ),
  slugs: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Post.shape.slug).optional().meta({
      description: 'Filter berdasarkan slug post',
    }),
  ),
  exclude: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(Post.shape.slug).optional().meta({
      description: 'Kecualikan slug tertentu',
    }),
  ),
  tags: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    z.array(z.string().trim().min(1, 'Tidak boleh kosong')).optional().meta({
      description: 'Filter berdasarkan slug tag',
    }),
  ),
  sortBy: z
    .enum([
      'title',
      'status',
      'section',
      'tags',
      'createdAt',
      'publishedAt',
      'publishedAtOrCreatedAt',
    ])
    .optional()
    .default('publishedAtOrCreatedAt')
    .meta({
      description:
        'Urut berdasarkan.<br>`publishedAtOrCreatedAt` = `publishedAt` jika ada, jika tidak maka `createdAt`.',
    }),
  sortDirection: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .meta({ description: 'Arah pengurutan' }),
});
export type PostsQuery = z.infer<typeof PostsQuery>;

export const PostWriteTags = z
  .array(z.union([Tag.shape.id, Tag.shape.slug]))
  .max(50, 'Maksimal 50 tag');

export const PostCreateBody = Post.pick({
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImageId: true,
  section: true,
  type: true,
  status: true,
  isFeatured: true,
  eventDate: true,
  externalLink: true,
}).extend({
  tags: PostWriteTags,
});
export type PostCreateBody = z.infer<typeof PostCreateBody>;

export const PostUpdateBody = PostCreateBody.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Minimal satu field wajib diisi' },
);
export type PostUpdateBody = z.infer<typeof PostUpdateBody>;
