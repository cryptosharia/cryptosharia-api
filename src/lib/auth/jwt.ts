/**
 * JWT utility functions for authentication.
 * Uses HS256 for symmetric token signing.
 */

import * as jose from 'jose';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '$env/static/private';
import { JWT_ISSUER, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '$lib/constants';

/**
 * Access token payload structure.
 */
export interface AccessTokenPayload {
	userId: string;
	roleId: string | null;
}

/**
 * Refresh token payload structure.
 */
export interface RefreshTokenPayload {
	userId: string;
	tokenId: string; // Links to refreshTokens table for revocation
}

/**
 * Generate a short-lived access token (15 minutes).
 */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
	const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);

	return await new jose.SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(JWT_ISSUER)
		.setIssuedAt()
		.setExpirationTime(ACCESS_TOKEN_EXPIRY)
		.sign(secret);
}

/**
 * Generate a long-lived refresh token (7 days).
 */
export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
	const secret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);

	return await new jose.SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer(JWT_ISSUER)
		.setIssuedAt()
		.setExpirationTime(REFRESH_TOKEN_EXPIRY)
		.sign(secret);
}

/**
 * Verify and decode an access token.
 * Returns the payload if valid, throws if invalid/expired.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
	const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);

	const { payload } = await jose.jwtVerify(token, secret, {
		issuer: JWT_ISSUER
	});

	return {
		userId: payload.userId as string,
		roleId: payload.roleId as string | null
	};
}

/**
 * Verify and decode a refresh token.
 * Returns the payload if valid, throws if invalid/expired.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
	const secret = new TextEncoder().encode(REFRESH_TOKEN_SECRET);

	const { payload } = await jose.jwtVerify(token, secret, {
		issuer: JWT_ISSUER
	});

	return {
		userId: payload.userId as string,
		tokenId: payload.tokenId as string
	};
}

/**
 * Generate a cryptographically secure random token for refresh token storage.
 */
export function generateRandomToken(length: number = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
