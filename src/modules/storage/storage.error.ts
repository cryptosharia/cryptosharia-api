import { MAX_FILE_SIZE } from './storage.constants';

export const STORAGE_ERRORS = {
  UPLOAD_FAILED: 'Upload file gagal',
  DELETION_FAILED: 'Hapus file gagal',
  FILE_TOO_LARGE: `Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB`,
} as const;

export type StorageErrorCode = keyof typeof STORAGE_ERRORS;

export class StorageError extends Error {
  name = 'StorageError';

  constructor(public code: StorageErrorCode) {
    super(STORAGE_ERRORS[code]);
  }
}
