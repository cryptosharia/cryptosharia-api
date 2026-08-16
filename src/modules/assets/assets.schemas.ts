import { z } from 'zod';
import { Asset, ImgbbImage } from '#src/modules/drizzle/drizzle.types';

const UploadFileSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string(),
  size: z.number().positive('File is required'),
  buffer: z.instanceof(Buffer),
  truncated: z.literal(false, { error: 'File is too large' }),
});
export type UploadFile = z.infer<typeof UploadFileSchema>;

export const AssetUpload = z.object({ file: UploadFileSchema });
export type AssetUpload = z.infer<typeof AssetUpload>;

export const ImgbbUpload = z.object({
  file: UploadFileSchema.refine(
    (file) => file.contentType.startsWith('image/'),
    'Only image files are allowed',
  ),
});
export type ImgbbUpload = z.infer<typeof ImgbbUpload>;

export const AssetResponse = Asset;
export type AssetResponse = z.infer<typeof AssetResponse>;

export const ImgbbImageResponse = ImgbbImage;
export type ImgbbImageResponse = z.infer<typeof ImgbbImageResponse>;

export const AssetCleanupOptions = z.object({
  dryRun: z.boolean().default(true),
  limit: z.number().int().positive().max(1000).default(100),
  maxAgeDays: z.number().int().positive().default(7),
});
export type AssetCleanupOptions = z.infer<typeof AssetCleanupOptions>;

export const AssetCleanupResult = z.object({
  dryRun: z.boolean(),
  candidates: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  failures: z.array(
    z.object({
      assetId: z.uuid(),
      pathname: z.string(),
      reason: z.string(),
    }),
  ),
});
export type AssetCleanupResult = z.infer<typeof AssetCleanupResult>;
