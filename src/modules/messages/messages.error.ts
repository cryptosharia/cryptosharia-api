export const MESSAGES_ERRORS = {
  MESSAGE_NOT_FOUND: 'Pesan tidak ditemukan',
} as const;

export type MessagesErrorCode = keyof typeof MESSAGES_ERRORS;

export class MessagesError extends Error {
  name = 'MessagesError';

  constructor(public code: MessagesErrorCode) {
    super(MESSAGES_ERRORS[code]);
  }
}
