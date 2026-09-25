import { z } from 'zod';
import { AuditMetadata } from '#src/modules/audit/audit.schemas';
import { TeamExpertiseItem, TeamMember } from '#src/modules/drizzle/drizzle.types';

export { TeamExpertiseItem };

export const TeamMemberIdParam = z.object({
  id: z.string().meta({ description: 'ID atau slug anggota tim' }),
});
export type TeamMemberIdParam = z.infer<typeof TeamMemberIdParam>;

export const TeamMembersQuery = z.object({
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
    .default(50)
    .meta({ description: 'Item per halaman' }),
  search: z
    .string()
    .trim()
    .max(255, 'Maksimal 255 karakter')
    .optional()
    .meta({
      description: 'Cari berdasarkan nama, peran, atau fokus',
      example: 'Sholahuddin',
    }),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    if (val === 'all') return undefined;
    return val;
  }, z.boolean().optional()).meta({
    description: 'Filter berdasarkan status aktif (default true untuk publik)',
  }),
  sortBy: z
    .enum(['orderIndex', 'name', 'createdAt'])
    .default('orderIndex')
    .meta({ description: 'Urutkan berdasarkan kolom' }),
  sortDirection: z
    .enum(['asc', 'desc'])
    .default('asc')
    .meta({ description: 'Arah pengurutan' }),
});
export type TeamMembersQuery = z.infer<typeof TeamMembersQuery>;

export const TeamMemberCreateBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(150, 'Nama maksimal 150 karakter')
    .meta({ description: 'Nama lengkap anggota tim', example: 'Sholahuddin Al Ayyubi' }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, 'Slug maksimal 100 karakter')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Format slug hanya boleh huruf kecil, angka, dan tanda hubung')
    .optional()
    .meta({ description: 'Slug unik anggota tim', example: 'sholahuddin' }),
  credentials: z
    .string()
    .trim()
    .max(150, 'Kredensial maksimal 150 karakter')
    .optional()
    .nullable()
    .meta({ description: 'Gelar atau kredensial', example: 'B.B.A., M.Sc.' }),
  role: z
    .string()
    .trim()
    .min(2, 'Jabatan minimal 2 karakter')
    .max(150, 'Jabatan maksimal 150 karakter')
    .meta({ description: 'Jabatan / Peran', example: 'Chief Executive Officer' }),
  imageId: z
    .string()
    .uuid('ID foto profil harus berupa UUID')
    .optional()
    .nullable()
    .meta({ description: 'ID aset foto profil yang diunggah' }),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .meta({ description: 'URL foto profil langsung atau path lokal', example: '/team/ceo-sholahuddin-al-ayyubi.webp' }),
  description: z
    .string()
    .trim()
    .min(5, 'Deskripsi minimal 5 karakter')
    .meta({ description: 'Deskripsi / peran anggota tim' }),
  focus: z
    .string()
    .trim()
    .min(2, 'Fokus minimal 2 karakter')
    .max(255, 'Fokus maksimal 255 karakter')
    .meta({ description: 'Fokus bidang', example: 'Strategi Perusahaan & Partnership' }),
  contribution: z
    .string()
    .trim()
    .optional()
    .nullable()
    .meta({ description: 'Kontribusi penting dalam ekosistem' }),
  joined: z
    .string()
    .trim()
    .max(100, 'Waktu bergabung maksimal 100 karakter')
    .optional()
    .nullable()
    .meta({ description: 'Waktu bergabung', example: '25 Mei 2025' }),
  expertise: z
    .array(TeamExpertiseItem)
    .default([])
    .meta({ description: 'Daftar keahlian / spesialisasi' }),
  orderIndex: z
    .number()
    .int('Harus berupa bilangan bulat')
    .default(0)
    .meta({ description: 'Urutan prioritas tampilan' }),
  isActive: z
    .boolean()
    .default(true)
    .meta({ description: 'Status apakah ditampilkan ke publik' }),
});
export type TeamMemberCreateBody = z.infer<typeof TeamMemberCreateBody>;

export const TeamMemberUpdateBody = TeamMemberCreateBody.partial();
export type TeamMemberUpdateBody = z.infer<typeof TeamMemberUpdateBody>;

export const TeamMemberResponse = TeamMember.omit({
  createdBy: true,
  updatedBy: true,
})
  .extend({
    image: z.string().meta({ description: 'URL foto profil yang telah di-resolve' }),
  })
  .extend(AuditMetadata.shape);
export type TeamMemberResponse = z.infer<typeof TeamMemberResponse>;

export const TeamMemberListResponse = z.object({
  items: z.array(TeamMemberResponse),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type TeamMemberListResponse = z.infer<typeof TeamMemberListResponse>;
