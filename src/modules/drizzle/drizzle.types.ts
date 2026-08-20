import { createSelectSchema } from 'drizzle-zod';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { z } from 'zod';
import * as schema from './drizzle.schema';
import {
  activityLogs,
  assets,
  imgbbImages,
  messages,
  postTags,
  posts,
  tags,
  cryptoassetTags,
  cryptoassets,
  users,
} from './drizzle.schema';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugMessage = 'Hanya boleh berisi huruf kecil, angka, dan tanda hubung';

export type DbExecutor =
  | NeonDatabase<typeof schema>
  | Parameters<Parameters<NeonDatabase<typeof schema>['transaction']>[0]>[0];

export const User = createSelectSchema(users, {
  id: (f) => f.meta({ description: 'ID user' }),
  name: (f) =>
    f
      .trim()
      .min(2, 'Minimal 2 karakter')
      .max(120, 'Maksimal 120 karakter')
      .meta({ description: 'Nama user', example: 'John Doe' }),
  email: z.email('Format tidak valid').max(255, 'Maksimal 255 karakter').meta({
    description: 'Email untuk login',
    example: 'john@example.com',
  }),
  avatarId: (f) => f.meta({ description: 'Foto profil user' }),
  role: (f) =>
    f.meta({
      description: 'Role user',
      example: 'member',
    }),
  status: (f) => f.meta({ description: 'Status akun', example: 'active' }),
  lastLoginAt: (f) => f.meta({ description: 'Login terakhir' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  updatedAt: (f) => f.meta({ description: 'Waktu diubah' }),
  updatedBy: (f) => f.meta({ description: 'User pengubah terakhir' }),
});
export type User = z.infer<typeof User>;

export const ActivityLog = createSelectSchema(activityLogs, {
  id: (f) => f.meta({ description: 'ID log aktivitas' }),
  userId: (f) => f.meta({ description: 'User yang melakukan aksi' }),
  action: z
    .enum([
      'asset.upload',
      'auth.otp.request',
      'auth.otp.verify',
      'auth.refresh',
      'auth.signin',
      'auth.signout',
      'auth.signout-all',
      'imgbb.upload',
      'post.create',
      'post.delete',
      'post.update',
      'tag.create',
      'tag.delete',
      'tag.update',
      'cryptoasset.create',
      'cryptoasset.delete',
      'cryptoasset.update',
      'user.role.update',
      'user.status.update',
      'user.update',
    ])
    .meta({
      description: 'Aksi yang dilakukan',
      example: 'auth.signin',
    }),
  subjectType: z
    .enum([
      'asset',
      'auth',
      'imgbb_image',
      'posts',
      'tags',
      'cryptoassets',
      'user',
    ])
    .meta({ description: 'Tipe subjek', example: 'auth' }),
  subjectId: (f) => f.meta({ description: 'ID subjek' }),
  description: (f) => f.meta({ description: 'Rincian aktivitas' }),
  ipAddress: (f) =>
    f.max(45, 'IP maksimal 45 karakter').meta({ description: 'IP klien' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
});
export type ActivityLog = z.infer<typeof ActivityLog>;

export const Asset = createSelectSchema(assets, {
  id: (f) => f.meta({ description: 'ID aset' }),
  pathname: (f) =>
    f
      .min(1, 'Tidak boleh kosong')
      .meta({ description: 'Path objek di storage provider' }),
  filename: (f) =>
    f.min(1, 'Tidak boleh kosong').max(255, 'Maksimal 255 karakter').meta({
      description: 'Nama file',
      example: 'cover.png',
    }),
  size: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Ukuran objek dalam byte', example: 1024 }),
  mimeType: (f) =>
    f.max(100, 'Maksimal 100 karakter').meta({
      description: 'Tipe MIME objek',
      example: 'image/png',
    }),
  width: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Lebar gambar (piksel)' }),
  height: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Tinggi gambar (piksel)' }),
  provider: (f) =>
    f.meta({
      description: 'Storage provider pemilik objek',
      example: 'vercel_blob',
    }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  createdBy: (f) => f.meta({ description: 'User yang upload aset' }),
});
export type Asset = z.infer<typeof Asset>;

export const ImgbbImage = createSelectSchema(imgbbImages, {
  id: (f) => f.meta({ description: 'ID gambar ImgBB' }),
  imgbbId: (f) =>
    f
      .min(1, 'Tidak boleh kosong')
      .max(255, 'Maksimal 255 karakter')
      .meta({ description: 'ID aset di ImgBB' }),
  title: (f) =>
    f.min(1, 'Tidak boleh kosong').max(255, 'Maksimal 255 karakter').meta({
      description: 'Judul aset ImgBB',
      example: 'CryptoSharia cover',
    }),
  url: z.url('Format tidak valid').meta({ description: 'URL aset ImgBB' }),
  width: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Lebar gambar (piksel)' }),
  height: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Tinggi gambar (piksel)' }),
  size: (f) =>
    f
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Ukuran objek dalam byte' }),
  fileName: (f) =>
    f
      .min(1, 'Tidak boleh kosong')
      .max(255, 'Maksimal 255 karakter')
      .meta({ description: 'Nama file', example: 'cover.png' }),
  mimeType: (f) =>
    f
      .min(1, 'Tipe MIME tidak boleh kosong')
      .max(100, 'Maksimal 100 karakter')
      .meta({ description: 'Tipe MIME', example: 'image/png' }),
  deleteUrl: z
    .url('Format tidak valid')
    .meta({ description: 'URL untuk menghapus aset' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  createdBy: (f) => f.meta({ description: 'User yang upload gambar' }),
});
export type ImgbbImage = z.infer<typeof ImgbbImage>;

export const Tag = createSelectSchema(tags, {
  id: (f) => f.meta({ description: 'ID tag' }),
  name: (f) =>
    f.trim().min(1, 'Tidak boleh kosong').max(50, 'Maksimal 50 karakter').meta({
      description: 'Nama tag',
      example: 'Halal Crypto',
    }),
  slug: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(50, 'Maksimal 50 karakter')
      .regex(slugPattern, slugMessage)
      .meta({
        description: 'Slug tag',
        example: 'halal-crypto',
      }),
  description: (f) => f.meta({ description: 'Deskripsi tag' }),
  contentSection: (f) =>
    f.meta({
      description: 'Seksi konten',
    }),
  showInNavigation: (f) => f.meta({ description: 'Tampil di navigasi' }),
  displayOrder: (f) =>
    f
      .int('Harus bilangan bulat')
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Urutan tampil' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  updatedAt: (f) => f.meta({ description: 'Waktu diubah' }),
  createdBy: (f) => f.meta({ description: 'User yang buat tag' }),
  updatedBy: (f) => f.meta({ description: 'User yang edit tag' }),
});
export type Tag = z.infer<typeof Tag>;

export const Cryptoasset = createSelectSchema(cryptoassets, {
  id: (f) => f.meta({ description: 'ID cryptoasset' }),
  slug: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(100, 'Maksimal 100 karakter')
      .regex(slugPattern, slugMessage)
      .meta({
        description: 'Slug cryptoasset',
        example: 'bitcoin',
      }),
  rank: (f) =>
    f
      .int('Harus berupa bilangan bulat')
      .positive('Harus berupa bilangan bulat positif')
      .meta({ description: 'Rank kapitalisasi pasar global', example: 1 }),
  name: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(100, 'Maksimal 100 karakter')
      .meta({ description: 'Nama cryptoasset', example: 'Bitcoin' }),
  ticker: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(20, 'Maksimal 20 karakter')
      .meta({ description: 'Simbol cryptoasset', example: 'BTC' }),
  shariaStatus: (f) =>
    f.meta({ description: 'Status syariah', example: 'halal' }),
  status: (f) =>
    f.meta({
      description: 'Status publikasi',
      example: 'published',
    }),
  excerpt: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .meta({ description: 'Ringkasan cryptoasset' }),
  tradingviewSymbol: (f) =>
    f
      .max(64, 'Maksimal 64 karakter')
      .meta({ description: 'Simbol TradingView', example: 'BINANCE:BTCUSDT' }),
  website: z.url('Format tidak valid').meta({
    description: 'Situs resmi',
    example: 'https://bitcoin.org',
  }),
  logoId: (f) => f.meta({ description: 'Logo cryptoasset' }),
  content: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .meta({ description: 'Analisis syariah / deskripsi proyek' }),
  publishedAt: (f) => f.meta({ description: 'Waktu publikasi' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  updatedAt: (f) => f.meta({ description: 'Waktu diubah' }),
  createdBy: (f) => f.meta({ description: 'User yang buat cryptoasset' }),
  updatedBy: (f) => f.meta({ description: 'User yang edit cryptoasset' }),
});
export type Cryptoasset = z.infer<typeof Cryptoasset>;

export const Post = createSelectSchema(posts, {
  id: (f) => f.meta({ description: 'ID post' }),
  title: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(255, 'Maksimal 255 karakter')
      .meta({
        description: 'Judul post',
        example: 'Understanding Halal Crypto',
      }),
  slug: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .max(255, 'Maksimal 255 karakter')
      .regex(slugPattern, slugMessage)
      .meta({
        description: 'Slug post',
        example: 'understanding-halal-crypto',
      }),
  excerpt: (f) =>
    f
      .trim()
      .min(1, 'Tidak boleh kosong')
      .meta({ description: 'Ringkasan post' }),
  content: (f) =>
    f.trim().min(1, 'Tidak boleh kosong').meta({ description: 'Konten post' }),
  coverImageId: (f) => f.meta({ description: 'Gambar sampul post' }),
  section: (f) =>
    f.meta({ description: 'Kategori post', example: 'education' }),
  type: (f) => f.meta({ description: 'Tipe konten post', example: 'article' }),
  status: (f) =>
    f.meta({
      description: 'Status publikasi',
      example: 'published',
    }),
  isFeatured: (f) => f.meta({ description: 'Post unggulan (featured)' }),
  eventDate: z.coerce
    .date({ error: 'Format tidak valid' })
    .nullable()
    .optional()
    .meta({ description: 'Tanggal event' }),
  externalLink: z
    .url('Format tidak valid')
    .nullable()
    .meta({ description: 'Link eksternal' }),
  publishedAt: (f) => f.meta({ description: 'Waktu publikasi' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
  updatedAt: (f) => f.meta({ description: 'Waktu diubah' }),
  createdBy: (f) => f.meta({ description: 'User yang buat post' }),
  updatedBy: (f) => f.meta({ description: 'User yang edit post' }),
});
export type Post = z.infer<typeof Post>;

export const CryptoassetTag = createSelectSchema(cryptoassetTags, {
  cryptoassetId: (f) => f.meta({ description: 'ID cryptoasset' }),
  tagId: (f) => f.meta({ description: 'ID tag' }),
  displayOrder: (f) =>
    f
      .int('Harus berupa bilangan bulat')
      .nonnegative('Tidak boleh negatif')
      .meta({ description: 'Display order' }),
});
export type CryptoassetTag = z.infer<typeof CryptoassetTag>;

export const PostTag = createSelectSchema(postTags, {
  postId: (f) => f.meta({ description: 'ID post' }),
  tagId: (f) => f.meta({ description: 'ID tag' }),
  displayOrder: (f) =>
    f
      .int('Display order harus bilangan bulat')
      .nonnegative('Display order tidak boleh negatif')
      .meta({ description: 'Display order' }),
});
export type PostTag = z.infer<typeof PostTag>;

export const Message = createSelectSchema(messages, {
  id: (f) => f.meta({ description: 'ID pesan' }),
  name: (f) =>
    f
      .trim()
      .min(2, 'Minimal 2 karakter')
      .max(120, 'Maksimal 120 karakter')
      .meta({ description: 'Nama pengirim', example: 'John Doe' }),
  email: z
    .email('Format tidak valid')
    .max(255, 'Maksimal 255 karakter')
    .meta({ description: 'Email pengirim', example: 'john@example.com' }),
  message: (f) =>
    f
      .min(10, 'Minimal 10 karakter')
      .max(5000, 'Maksimal 5000 karakter')
      .meta({ description: 'Isi pesan' }),
  createdAt: (f) => f.meta({ description: 'Waktu dibuat' }),
});
export type Message = z.infer<typeof Message>;
