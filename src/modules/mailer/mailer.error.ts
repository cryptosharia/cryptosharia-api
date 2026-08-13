export const MAILER_ERRORS = {
  MAILER_PROVIDER_FAILURE: 'Email provider failed',
} as const;

export type MailerErrorCode = keyof typeof MAILER_ERRORS;

export class MailerError extends Error {
  name = 'MailerError';

  constructor(public code: MailerErrorCode) {
    super(MAILER_ERRORS[code]);
  }
}
