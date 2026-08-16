export const AUTH_ERRORS = {
  EMAIL_ALREADY_REGISTERED: 'Email sudah terdaftar',
  INVALID_CREDENTIALS: 'Email atau password salah',
  USER_INACTIVE: 'Akun tidak aktif. Hubungi support.',
  VERIFICATION_TOKEN_INVALID: 'Token verifikasi tidak valid atau kedaluwarsa',
  PASSWORD_RESET_TOKEN_INVALID:
    'Token reset password tidak valid atau kedaluwarsa',
  REFRESH_TOKEN_INVALID: 'Refresh token tidak valid atau kedaluwarsa',
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export class AuthError extends Error {
  name = 'AuthError';

  constructor(public code: AuthErrorCode) {
    super(AUTH_ERRORS[code]);
  }
}
