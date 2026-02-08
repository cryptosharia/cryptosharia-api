/**
 * Password hashing utilities using Argon2.
 */

import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
	return await argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: 19456, // 19MB
		timeCost: 2,
		parallelism: 1
	});
}

/**
 * Verify a password against a hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

/**
 * Check if a hash needs to be rehashed (e.g., algorithm upgrade).
 */
export function needsRehash(hash: string): boolean {
	return argon2.needsRehash(hash);
}
