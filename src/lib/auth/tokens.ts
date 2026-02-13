/**
 * JWT utility functions for authentication.
 * Uses HS256 for symmetric token signing.
 */

import * as jose from 'jose';
import { ACCESS_TOKEN_SECRET } from '$env/static/private';
import { JWT_ISSUER } from '$lib/constants';

/**
 * Access token payload structure.
 */
export interface AccessTokenPayload {
	userId: string;
	role: string;
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
		.setExpirationTime('15m')
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
		role: payload.role as string
	};
}

/**
 * Generate a cryptographically secure random token for refresh token storage.
 * This is used for opaque tokens that are stored in the database.
 */
export function generateRandomToken(length: number = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createRefreshToken(userId: string) {
	const token = generateRandomToken();
	const expiresAt = new Date();

	expiresAt.setDate(expiresAt.getDate() + 15);

	return {
		userId,
		token,
		expiresAt
	};
}
