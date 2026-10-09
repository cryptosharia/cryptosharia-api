export const MARKET_DATA_ERRORS = {
  QUOTES_FETCH_FAILED: 'Gagal mengambil data pasar',
} as const;

export type MarketDataErrorCode = keyof typeof MARKET_DATA_ERRORS;

export type MarketDataFailureCategory =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'UPSTREAM_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'MALFORMED_RESPONSE';

export interface MarketDataDiagnostics {
  category: MarketDataFailureCategory;
  statusCode?: number;
  message?: string;
  requestedCount?: number;
}

export class MarketDataError extends Error {
  name = 'MarketDataError';

  constructor(
    public code: MarketDataErrorCode,
    public readonly statusCode?: number,
    public readonly category?: MarketDataFailureCategory,
    public readonly diagnostics?: MarketDataDiagnostics,
    public readonly cause?: unknown,
  ) {
    super(MARKET_DATA_ERRORS[code]);
  }
}
