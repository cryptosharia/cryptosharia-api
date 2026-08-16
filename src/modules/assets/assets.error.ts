export const ASSETS_ERRORS = {
  STORAGE_UPLOAD_FAILED: 'Upload file gagal',
  IMAGE_UPLOAD_FAILED: 'Upload gambar gagal',
} as const;

export type AssetsErrorCode = keyof typeof ASSETS_ERRORS;

export class AssetsError extends Error {
  name = 'AssetsError';

  constructor(public code: AssetsErrorCode) {
    super(ASSETS_ERRORS[code]);
  }
}
