export const MAILER_ERRORS = {
  MAILER_PROVIDER_FAILURE: 'Gagal mengirim email',
} as const;

export type MailerErrorCode = keyof typeof MAILER_ERRORS;

export class MailerError extends Error {
  name = 'MailerError';

  constructor(public code: MailerErrorCode) {
    super(MAILER_ERRORS[code]);
  }
}
