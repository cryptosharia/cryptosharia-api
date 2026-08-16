export const ASSETS_ERRORS = {
  STORAGE_UPLOAD_FAILED: 'Storage provider upload failed',
  IMAGE_UPLOAD_FAILED: 'Image provider upload failed',
} as const;

export type AssetsErrorCode = keyof typeof ASSETS_ERRORS;

export class AssetsError extends Error {
  name = 'AssetsError';

  constructor(public code: AssetsErrorCode) {
    super(ASSETS_ERRORS[code]);
  }
}
