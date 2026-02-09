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
