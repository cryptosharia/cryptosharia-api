/**
 * Utility functions for testing ONLY purposes.
 * DO NOT import this file into production code.
 */

import createClient from 'openapi-fetch';
import type { paths } from './api-types';
import { db } from './db';
import { users } from './db/tables';
import { env } from '$env/dynamic/private';
import { hashPassword } from './auth/password';

/**
 * Creates a type-safe openapi-fetch client for real HTTP requests.
 */
export function createApiTestClient() {
	return createClient<paths>({
		baseUrl: env.TEST_URL,
		headers: {
			'Api-Key': env.CS_API_KEY_TEST!
		}
	});
}

/**
 * Factory to create a test user in the database.
 *
 * @param overrides - Optional fields to override defaults
 * @returns The created user record
 */
export async function createTestUser(overrides?: Partial<typeof users.$inferInsert>) {
	const random = Math.random().toString(36).substring(7);

	const [user] = await db
		.insert(users)
		.values({
			name: 'Test User',
			email: `test-${random}@example.com`,
			hashedPassword: await hashPassword('password123'),
			passwordHashingAlgorithm: 'argon2id',
			avatarUrl: env.TEST_URL + '/favicon.svg',
			...overrides
		})
		.returning();

	return user;
}
