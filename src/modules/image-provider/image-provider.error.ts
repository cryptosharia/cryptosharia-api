import { MAX_IMAGE_SIZE } from './image-provider.constants';

export const IMAGE_PROVIDER_ERRORS = {
  INVALID_FILE: 'Hanya file gambar yang diperbolehkan',
  FILE_TOO_LARGE: `Ukuran gambar maksimal ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
  UPLOAD_FAILED: 'Upload gambar gagal',
} as const;

export type ImageProviderErrorCode = keyof typeof IMAGE_PROVIDER_ERRORS;

export class ImageProviderError extends Error {
  name = 'ImageProviderError';

  constructor(public code: ImageProviderErrorCode) {
    super(IMAGE_PROVIDER_ERRORS[code]);
  }
}
