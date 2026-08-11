export const USERS_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  EMAIL_UNIQUE_VIOLATION: 'Email must be unique',
  USER_UPDATE_EMPTY: 'At least one field is required',
} as const;

export type UsersErrorCode = keyof typeof USERS_ERRORS;

export class UsersError extends Error {
  name = 'UsersError';

  constructor(public code: UsersErrorCode) {
    super(USERS_ERRORS[code]);
  }
}
