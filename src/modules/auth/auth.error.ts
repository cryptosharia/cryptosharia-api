export const AUTH_ERRORS = {
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_INACTIVE: 'Your account is not active. Please contact support.',
  VERIFICATION_TOKEN_INVALID: 'Invalid or expired verification token',
  PASSWORD_RESET_TOKEN_INVALID: 'Invalid or expired password reset token',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export class AuthError extends Error {
  name = 'AuthError';

  constructor(public code: AuthErrorCode) {
    super(AUTH_ERRORS[code]);
  }
}
