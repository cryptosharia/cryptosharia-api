/**
 * Application-wide constants.
 */

/** Base domain for the CryptoSharia ecosystem */
export const BASE_DOMAIN = 'cryptosharia.id';

/** API subdomain */
export const API_DOMAIN = `api.${BASE_DOMAIN}`;

/** Cookie domain (shared across all subdomains) */
export const COOKIE_DOMAIN = `.${BASE_DOMAIN}`;

/** JWT issuer claim */
export const JWT_ISSUER = API_DOMAIN;

/** Development base URL */
export const DEV_BASE_URL = 'http://localhost:5173';

/** Rate limiting configurations */
export const RATELIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATELIMIT_MAX = process.env.NODE_ENV === 'test' ? 1000 : 100; // prod = 100, test = 1000
