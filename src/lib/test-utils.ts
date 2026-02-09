/**
 * Utility functions for testing ONLY purposes.
 * DO NOT import this file into production code.
 */

import createClient from 'openapi-fetch';
import type { paths } from './api-types';
import type { ResolveOptions } from '@sveltejs/kit';
import { db } from './db';
import { users } from './db/tables';
import { DEV_BASE_URL } from './constants';

/**
 * Creates a mock SvelteKit RequestEvent for unit testing handlers or hooks.
 * Now supports both init.body (string) or an actual Request object.
 */
export function createMockRequestEvent<T>(
	urlString: string,
	requestOrInit?: Request | RequestInit,
	params: Record<string, string> = {}
): T {
	const url = new URL(urlString);

	// Determine if we received a Request object or RequestInit
	const isRequest = requestOrInit instanceof Request;

	const headers = isRequest
		? new Headers(requestOrInit.headers)
		: new Headers(requestOrInit?.headers);

	// Create a minimal Request-like object that satisfies SvelteKit's RequestEvent
	const request = isRequest
		? requestOrInit
		: ({
				url: urlString,
				method: requestOrInit?.method || 'GET',
				headers,
				json: async () => {
					const body = requestOrInit?.body;
					return body ? JSON.parse(body as string) : null;
				},
				text: async () => (requestOrInit?.body as string) || '',
				clone: function () {
					return { ...this };
				}
			} as unknown as Request);

	return {
		url,
		request,
		params,
		locals: {},
		route: { id: null },
		cookies: {
			get: () => undefined,
			getAll: () => [],
			set: () => {},
			delete: () => {},
			serialize: () => ''
		}
	} as unknown as T;
}

/**
 * Creates a "virtual fetch" that routes requests directly to SvelteKit handlers.
 * Optionally wraps the request in a SvelteKit `handle` hook.
 *
 * @param handlers - A record or module containing SvelteKit RequestHandlers
 * @param handle - Optional SvelteKit handle hook
 * @returns A fetch-compatible function
 */
export function createVirtualFetch<T>(
	handlers: Record<string, (event: T) => Response | Promise<Response>>,
	handle?: (args: {
		event: T;
		resolve: (event: T, opts?: ResolveOptions) => Response | Promise<Response>;
	}) => Response | Promise<Response>
) {
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		let urlString: string;
		let requestObject: Request | undefined;

		if (input instanceof Request) {
			urlString = input.url;
			requestObject = input;
		} else {
			urlString = input.toString();
		}

		const method = requestObject?.method || init?.method?.toUpperCase() || 'GET';

		const handler = handlers[method];
		if (!handler) {
			return new Response(`Method ${method} not implemented`, { status: 405 });
		}

		// Pass either the Request object or the init
		const event = createMockRequestEvent<T>(urlString, requestObject || init);

		const resolve = (ev: T) => {
			const result = handler(ev);
			return result instanceof Promise ? result : Promise.resolve(result);
		};

		const result = handle ? handle({ event, resolve }) : resolve(event);
		return result instanceof Promise ? result : Promise.resolve(result);
	};
}

/**
 * Creates a type-safe openapi-fetch client that talks directly to a SvelteKit handler module.
 *
 * @param handlers - The SvelteKit handler module (import * as Module from './+server')
 * @param options - Optional headers and handle hook
 * @returns A type-safe client
 */
export function createApiTestClient<T>(
	handlers: Record<string, (event: T) => Response | Promise<Response>>,
	options?: {
		headers?: Record<string, string>;
		handle?: (args: {
			event: T;
			resolve: (event: T, opts?: ResolveOptions) => Response | Promise<Response>;
		}) => Response | Promise<Response>;
	}
) {
	return createClient<paths>({
		baseUrl: DEV_BASE_URL,
		fetch: (input: RequestInfo | URL, init?: RequestInit) => {
			const fetchWithMiddleware = createVirtualFetch(handlers, options?.handle);

			// If input is a Request, we need to merge headers differently
			if (input instanceof Request) {
				// Clone the request with additional headers if needed
				if (options?.headers) {
					const newHeaders = new Headers(input.headers);
					Object.entries(options.headers).forEach(([k, v]) => newHeaders.set(k, v));
					const newRequest = new Request(input, { headers: newHeaders });
					return fetchWithMiddleware(newRequest, init);
				}
				return fetchWithMiddleware(input, init);
			}

			const mergedInit: RequestInit = { ...init };
			const headers = new Headers(options?.headers);
			if (init?.headers) {
				new Headers(init.headers).forEach((v, k) => headers.set(k, v));
			}
			mergedInit.headers = headers;

			return fetchWithMiddleware(input, mergedInit);
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
			hashedPassword: 'hashed_password',
			...overrides
		})
		.returning();

	return user;
}
