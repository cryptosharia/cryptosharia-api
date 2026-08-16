export const RATE_LIMIT_ERRORS = {
  RATE_LIMIT_PROVIDER_UNAVAILABLE: 'Layanan rate limit tidak tersedia',
} as const;

export type RateLimitErrorCode = keyof typeof RATE_LIMIT_ERRORS;

export class RateLimitError extends Error {
  name = 'RateLimitError';

  constructor(public code: RateLimitErrorCode) {
    super(RATE_LIMIT_ERRORS[code]);
  }
}
