import { MAX_FILE_SIZE } from './storage.constants';

export const STORAGE_ERRORS = {
  UPLOAD_FAILED: 'File upload failed',
  DELETION_FAILED: 'File deletion failed',
  FILE_TOO_LARGE: `File must be ${MAX_FILE_SIZE / 1024 / 1024}MB or less`,
} as const;

export type StorageErrorCode = keyof typeof STORAGE_ERRORS;

export class StorageError extends Error {
  name = 'StorageError';

  constructor(public code: StorageErrorCode) {
    super(STORAGE_ERRORS[code]);
  }
}
