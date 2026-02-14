/**
 * Utility functions for testing ONLY purposes.
 * DO NOT import this file into production code.
 */

import createClient from 'openapi-fetch';
import type { paths } from './api-types';
import { db } from './db';
import { users, posts, tokens, assets } from './db/tables';
import { env } from '$env/dynamic/private';
import { hashPassword } from './auth/password';
import type { Role } from './auth/rbac';

const TEST_USER_PASSWORD = 'password12345';

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

/**
 * Creates a type-safe openapi-fetch client for real HTTP requests.
 */
export function createApiTestClient({
	useApiKey = true,
	headers = {}
}: { useApiKey?: boolean; headers?: Record<string, string> } = {}) {
	const finalHeaders: Record<string, string> = {
		'Api-Key': useApiKey ? (env.CS_API_KEY_TEST ?? '') : '',
		...headers
	};

	return createClient<paths>({
		baseUrl: env.TEST_URL,
		headers: finalHeaders
	});
}

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------

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
 * Creates a test user, signs them in, and returns everything needed for
 * authenticated API calls. Eliminates the repeated createTestUser + signTestUserIn + header pattern.
 *
 * @example
 * const { client, user, accessToken } = await createAuthenticatedClient('admin');
 * const { data } = await client.GET('/posts', { ... });
 */
export async function createAuthenticatedClient(role: Role = 'member') {
	const user = await createTestUser({ role, isEmailVerified: true });
	const accessToken = await signTestUserIn(user.email);
	const client = createApiTestClient({
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	return { client, user, accessToken };
}

// ---------------------------------------------------------------------------
// Data Factories
// ---------------------------------------------------------------------------

/**
 * Factory to create a test user in the database.
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
export async function createTestAsset(overrides?: Partial<typeof assets.$inferInsert>) {
	const [asset] = await db
		.insert(assets)
		.values({
			pathname: 'test/image.jpg',
			filename: 'image.jpg',
			size: 100,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 100,
			height: 100,
			...overrides
		})
		.returning();
	return asset;
}

/**
 * Factory to create a test post in the database.
 * Automatically creates a cover image asset if `coverImageId` is not provided.
 */
export async function createTestPost(overrides?: Partial<typeof posts.$inferInsert>) {
	const coverImageId = overrides?.coverImageId ?? (await createTestAsset()).id;
	const random = Math.floor(Math.random() * 1000000);

	const [post] = await db
		.insert(posts)
		.values({
			title: `Test Post ${random}`,
			slug: `test-post-${random}`,
			section: 'news',
			type: 'article',
			status: 'published',
			content: 'Test content.',
			excerpt: 'Test excerpt.',
			coverImageId,
			...overrides
		})
		.returning();

	return post;
}

/**
 * Factory to create a test token in the database.
 * Automatically creates a logo asset if `logoId` is not provided.
 */
export async function createTestToken(overrides?: Partial<typeof tokens.$inferInsert>) {
	const logoId = overrides?.logoId ?? (await createTestAsset()).id;
	const random = Math.floor(Math.random() * 1000000);

	const [token] = await db
		.insert(tokens)
		.values({
			name: `Test Token ${random}`,
			ticker: `TT${random}`,
			slug: `test-token-${random}`,
			shariaStatus: 'halal',
			rank: random,
			status: 'published',
			excerpt: 'Test excerpt.',
			content: 'Test content.',
			website: 'https://example.com',
			logoId,
			...overrides
		})
		.returning();

	return token;
}
