export const TOKENS_ERRORS = {
  TOKEN_NOT_FOUND: 'Cryptoasset tidak ditemukan',
  SLUG_CONFLICT: 'Slug cryptoasset sudah ada',
  TICKER_CONFLICT: 'Ticker cryptoasset sudah ada',
  QUOTES_UNAVAILABLE: 'Data pasar tidak tersedia',
} as const;

export type TokensErrorCode = keyof typeof TOKENS_ERRORS;

export class TokensError extends Error {
  name = 'TokensError';

  constructor(public code: TokensErrorCode) {
    super(TOKENS_ERRORS[code]);
  }
}
