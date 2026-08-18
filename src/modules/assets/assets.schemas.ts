import { z } from 'zod';
import { Asset, ImgbbImage } from '#src/modules/drizzle/drizzle.types';

const UploadFileSchema = z.object({
  filename: z.string().min(1, 'Tidak boleh kosong'),
  contentType: z.string(),
  size: z.number().positive('File wajib diisi'),
  buffer: z.instanceof(Buffer),
  truncated: z.literal(false, { error: 'File terlalu besar' }),
});
export type UploadFile = z.infer<typeof UploadFileSchema>;

export const AssetUpload = z.object({ file: UploadFileSchema });
export type AssetUpload = z.infer<typeof AssetUpload>;

export const ImgbbUpload = z.object({
  file: UploadFileSchema.refine(
    (file) => file.contentType.startsWith('image/'),
    'Hanya file gambar yang diperbolehkan',
  ),
});
export type ImgbbUpload = z.infer<typeof ImgbbUpload>;

export const AssetResponse = Asset;
export type AssetResponse = z.infer<typeof AssetResponse>;

export const AssetMetadata = z.object({
  id: Asset.shape.id,
  url: z.url('Format tidak valid').meta({ description: 'URL publik aset' }),
  filename: Asset.shape.filename,
  size: Asset.shape.size,
  mimeType: Asset.shape.mimeType,
  width: Asset.shape.width,
  height: Asset.shape.height,
});
export type AssetMetadata = z.infer<typeof AssetMetadata>;

export const ImgbbImageResponse = ImgbbImage;
export type ImgbbImageResponse = z.infer<typeof ImgbbImageResponse>;

export const AssetCleanupOptions = z.object({
  dryRun: z.boolean().default(true),
  limit: z
    .number()
    .int('Harus berupa bilangan bulat')
    .positive('Harus berupa angka positif')
    .max(1000, 'Maksimal 1000')
    .default(100),
  maxAgeDays: z
    .number()
    .int('Harus berupa bilangan bulat')
    .positive('Harus berupa angka positif')
    .default(7),
});
export type AssetCleanupOptions = z.infer<typeof AssetCleanupOptions>;

export const AssetCleanupResult = z.object({
  dryRun: z.boolean(),
  candidates: z
    .number()
    .int('Harus berupa bilangan bulat')
    .nonnegative('Harus berupa angka non-negatif'),
  deleted: z
    .number()
    .int('Harus berupa bilangan bulat')
    .nonnegative('Harus berupa angka non-negatif'),
  failed: z
    .number()
    .int('Harus berupa bilangan bulat')
    .nonnegative('Harus berupa angka non-negatif'),
  failures: z.array(
    z.object({
      assetId: z.uuid(),
      pathname: z.string(),
      reason: z.string(),
    }),
  ),
});
export type AssetCleanupResult = z.infer<typeof AssetCleanupResult>;
