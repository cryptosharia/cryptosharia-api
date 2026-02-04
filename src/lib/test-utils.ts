/**
 * Utility functions for testing ONLY purposes.
 * DO NOT import this file into production code.
 */

import createClient from 'openapi-fetch';
import type { paths } from './api-types';
import { db } from './db';
import { admins } from './db/tables';

/**
 * Creates a "virtual fetch" that routes requests directly to SvelteKit handlers.
 * This looks at the HTTP method (GET, POST, etc.) to find the correct export from the module.
 *
 * @param handlers - A record or module containing SvelteKit RequestHandlers
 * @returns A fetch-compatible function
 */
export function createVirtualFetch<T>(
	handlers: Record<string, (event: T) => Response | Promise<Response>>
) {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const urlString =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.toString()
					: (input as Request).url;
		const url = new URL(urlString);
		const method = init?.method?.toUpperCase() || 'GET';

		const handler = handlers[method];
		if (!handler) {
			return new Response(`Method ${method} not implemented`, { status: 405 });
		}

		const event = {
			url,
			request: new Request(url, init),
			params: {},
			locals: {},
			route: { id: null }
		} as unknown as T;

		const result = handler(event);
		return result instanceof Promise ? result : Promise.resolve(result);
	};
}

/**
 * Creates a type-safe openapi-fetch client that talks directly to a SvelteKit handler module.
 *
 * @param handlers - The SvelteKit handler module (import * as Module from './+server')
 * @returns A type-safe client
 */
export function createApiTestClient<T>(
	handlers: Record<string, (event: T) => Response | Promise<Response>>
) {
	return createClient<paths>({
		baseUrl: 'http://localhost:5173',
		fetch: createVirtualFetch(handlers)
	});
}

/**
 * Factory to create a test admin in the database.
 *
 * @param overrides - Optional fields to override defaults
 * @returns The created admin record
 */
export async function createTestAdmin(overrides?: Partial<typeof admins.$inferInsert>) {
	const random = Math.random().toString(36).substring(7);

	const [admin] = await db
		.insert(admins)
		.values({
			name: 'Test Admin',
			email: `test-${random}@example.com`,
			hashedPassword: 'hashed_password',
			...overrides
		})
		.returning();

	return admin;
}
