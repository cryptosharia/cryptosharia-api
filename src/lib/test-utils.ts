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

const TEST_USER_PASSWORD = 'password12345';

/**
 * Creates a type-safe openapi-fetch client for real HTTP requests.
 */
export function createApiTestClient({
	useApiKey = true,
	headers = {}
}: { useApiKey?: boolean; headers?: Record<string, string> } = {}) {
	const finalHeaders: Record<string, string> = {
		'Api-Key': useApiKey ? env.CS_API_KEY_TEST : '',
		...headers
	};

	return createClient<paths>({
		baseUrl: env.TEST_URL,
		headers: finalHeaders
	});
}

/**
 * Signs in a test user and returns the access token.
 */
export async function signTestUserIn(email: string) {
	const client = createApiTestClient();
	const { data, response, error } = await client.POST('/auth/signin', {
		body: {
			email,
			password: TEST_USER_PASSWORD
		}
	});

	if (!data?.data?.accessToken) {
		console.error('Signin failed:', { status: response.status, error });
		throw new Error(`Failed to sign in test user: ${email} (Status: ${response.status})`);
	}

	return data.data.accessToken;
}

/**
 * Factory to create a test user in the database.
 *
 * @param overrides - Optional fields to override defaults
 * @returns The created user record
 */
export async function createTestUser(overrides?: Partial<typeof users.$inferInsert>) {
	const random = Math.floor(Math.random() * 1000000);

	try {
		const [user] = await db
			.insert(users)
			.values({
				name: `Test User ${random}`,
				email: `test-${random}@example.com`,
				hashedPassword: await hashPassword(TEST_USER_PASSWORD),
				passwordHashingAlgorithm: 'argon2id',
				status: 'active',
				role: 'member',
				...overrides
			})
			.returning();

		return user;
	} catch (error) {
		console.error('Failed to create test user:', error);
		throw error;
	}
}

/**
 * Factory to create a test asset in the database.
 */
export async function createTestAsset() {
	const { assets } = await import('./db/tables');
	const [asset] = await db
		.insert(assets)
		.values({
			pathname: 'test/image.jpg',
			filename: 'image.jpg',
			size: 100,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 100,
			height: 100
		})
		.returning();
	return asset;
}
