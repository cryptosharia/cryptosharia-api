import { MAX_IMAGE_SIZE } from './image-provider.constants';

export const IMAGE_PROVIDER_ERRORS = {
  INVALID_FILE: 'Only image files are allowed',
  FILE_TOO_LARGE: `Image must be ${MAX_IMAGE_SIZE / 1024 / 1024}MB or less`,
  UPLOAD_FAILED: 'Image upload failed',
} as const;

export type ImageProviderErrorCode = keyof typeof IMAGE_PROVIDER_ERRORS;

export class ImageProviderError extends Error {
  name = 'ImageProviderError';

  constructor(public code: ImageProviderErrorCode) {
    super(IMAGE_PROVIDER_ERRORS[code]);
  }
}
