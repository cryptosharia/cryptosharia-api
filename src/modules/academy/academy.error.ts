export const ACADEMY_ERRORS = {
  SCOPE_NOT_FOUND: 'Lingkup akses kursus tidak ditemukan',
  CONTENT_NOT_FOUND: 'Konten pembelajaran tidak ditemukan',
  INVALID_CONTENT_HIERARCHY: 'Hierarki konten tidak valid atau induk tidak ditemukan',
  DUPLICATE_CONTENT_ORDER: 'Terdapat urutan konten duplikat pada induk yang sama',
  LESSON_NOT_PUBLISHED: 'Materi pembelajaran belum diterbitkan',
  MEDIA_NOT_FOUND: 'Media video materi belum terdaftar',
  GRANT_NOT_FOUND: 'Hak akses materi tidak ditemukan',
  GRANT_INACTIVE: 'Hak akses tidak aktif',
  GRANT_EXPIRED: 'Masa berlaku hak akses telah berakhir',
  GRANT_NOT_STARTED: 'Masa berlaku hak akses belum dimulai',
  GRANT_REVOKED: 'Hak akses telah dicabut',
  UNAUTHORIZED_SCOPE: 'Pengguna tidak memiliki hak akses untuk materi ini',
  COMPLETION_VERSION_MISMATCH: 'Versi materi tidak sesuai dengan versi publikasi aktif',
  INVALID_PROGRESS_POSITION: 'Posisi resume video di luar durasi materi yang valid',
} as const;

export type AcademyErrorCode = keyof typeof ACADEMY_ERRORS;

export class AcademyError extends Error {
  name = 'AcademyError';

  constructor(
    public readonly code: AcademyErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? ACADEMY_ERRORS[code]);
  }
}
