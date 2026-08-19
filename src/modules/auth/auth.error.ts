import type { OtpInvalidDetails } from './auth.schemas';

export const AUTH_ERRORS = {
  OTP_INVALID_OR_EXPIRED: 'Kode OTP tidak valid atau kedaluwarsa',
  OTP_MAX_ATTEMPTS_EXCEEDED:
    'Terlalu banyak percobaan. Request kode baru untuk melanjutkan.',
  OTP_REQUEST_RATE_LIMITED: 'Terlalu banyak request. Coba lagi nanti.',
  REFRESH_TOKEN_INVALID: 'Refresh token tidak valid atau kedaluwarsa',
  USER_INACTIVE: 'Akun tidak aktif. Hubungi support.',
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export class AuthError extends Error {
  name = 'AuthError';
  details?: OtpInvalidDetails;
  retryAfterSeconds?: number;

  constructor(
    public code: AuthErrorCode,
    options?: { details?: OtpInvalidDetails; retryAfterSeconds?: number },
  ) {
    super(AUTH_ERRORS[code]);
    this.details = options?.details;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}
