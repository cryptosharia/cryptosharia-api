export const MARKET_DATA_ERRORS = {
  QUOTES_FETCH_FAILED: 'Failed to fetch token quotes',
} as const;

export type MarketDataErrorCode = keyof typeof MARKET_DATA_ERRORS;

export class MarketDataError extends Error {
  name = 'MarketDataError';

  constructor(public code: MarketDataErrorCode) {
    super(MARKET_DATA_ERRORS[code]);
  }
}
