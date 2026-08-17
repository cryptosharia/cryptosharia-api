export const USERS_ERRORS = {
  USER_NOT_FOUND: 'User tidak ditemukan',
  EMAIL_UNIQUE_VIOLATION: 'Email harus unik',
} as const;

export type UsersErrorCode = keyof typeof USERS_ERRORS;

export class UsersError extends Error {
  name = 'UsersError';

  constructor(public code: UsersErrorCode) {
    super(USERS_ERRORS[code]);
  }
}
