// Use union string enum for error codes (e.g. 'A' | 'B' | 'C')
export type UsersErrorCode = 'NOT_FOUND' | 'EMAIL_UNIQUE_VIOLATION';

export class UsersError extends Error {
  name = 'UsersError';

  constructor(public message: UsersErrorCode) {
    super(message);
  }
}
