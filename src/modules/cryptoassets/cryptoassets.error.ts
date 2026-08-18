export const CRYPTOASSETS_ERRORS = {
  CRYPTOASSET_NOT_FOUND: 'Cryptoasset tidak ditemukan',
  SLUG_CONFLICT: 'Slug cryptoasset sudah ada',
  TICKER_CONFLICT: 'Ticker cryptoasset sudah ada',
  QUOTES_UNAVAILABLE: 'Data pasar tidak tersedia',
} as const;

export type CryptoassetsErrorCode = keyof typeof CRYPTOASSETS_ERRORS;

export class CryptoassetsError extends Error {
  name = 'CryptoassetsError';

  constructor(public code: CryptoassetsErrorCode) {
    super(CRYPTOASSETS_ERRORS[code]);
  }
}
