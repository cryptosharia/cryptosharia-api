import type { OtpInvalidDetails } from './auth.schemas';

export const AUTH_ERRORS = {
  OTP_INVALID_OR_EXPIRED: 'Kode OTP tidak valid atau kedaluwarsa',
  OTP_MAX_ATTEMPTS_EXCEEDED:
    'Terlalu banyak percobaan. Request kode baru untuk melanjutkan.',
  OTP_REQUEST_RATE_LIMITED: 'Terlalu banyak request. Coba lagi nanti.',
  REFRESH_TOKEN_INVALID: 'Refresh token tidak valid atau kedaluwarsa',
  USER_INACTIVE: 'Akun tidak aktif. Hubungi support.',
  PASSWORD_INVALID_CREDENTIALS: 'Email atau kata sandi tidak valid.',
  PASSWORD_LOGIN_RATE_LIMITED: 'Terlalu banyak percobaan. Coba lagi nanti.',
  PASSWORD_RESET_INVALID: 'Tautan reset tidak valid atau kedaluwarsa.',
  PASSWORD_ALREADY_SET: 'Kata sandi akun ini sudah tersedia.',
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
