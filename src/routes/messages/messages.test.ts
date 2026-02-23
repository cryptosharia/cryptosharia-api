import { describe, it, expect } from 'vitest';
import { createApiTestClient, createAuthenticatedClient } from '$lib/test-utils';

describe('Messages API Integration', () => {
	const client = createApiTestClient();

	// -----------------------------------------------------------------------
	// POST /messages (public)
	// -----------------------------------------------------------------------

	describe('POST /messages', () => {
		it('should successfully create a message with valid data and notify: false query param', async () => {
			const payload = {
				name: 'John Doe',
				email: 'john@example.com',
				message: 'Hello, I have a question about Sharia compliance.'
			};

			const { response, data } = await client.POST('/messages', {
				params: { query: { notify: false } },
				body: payload
			});

			expect(response.status).toBe(201);
			expect(data?.success).toBe(true);
			expect(data?.data?.name).toBe(payload.name);
			expect(data?.data?.email).toBe(payload.email);
			expect(data?.data?.message).toBe(payload.message);
			expect(data?.data?.id).toBeDefined();
		});

		it.each([
			{
				name: 'invalid email format',
				body: { name: 'John Doe', email: 'not-an-email', message: 'Valid message content' },
				errorField: 'email'
			},
			{
				name: 'empty message',
				body: { name: 'John Doe', email: 'john@example.com', message: '' }
			},
			{
				name: 'name exceeds max length (120)',
				body: { name: 'a'.repeat(121), email: 'john@example.com', message: 'Valid message' },
				errorField: 'name'
			},
			{
				name: 'message exceeds max length (5000)',
				body: { name: 'John Doe', email: 'john@example.com', message: 'a'.repeat(5001) },
				errorField: 'message'
			}
		])('should return 400 for $name', async ({ body, errorField }) => {
			const { response, error } = await client.POST('/messages', {
				params: { query: { notify: false } },
				body
			});

			expect(response.status).toBe(400);
			if (errorField) {
				expect(error?.errors?.[errorField]).toBeDefined();
			}
		});
	});

	// -----------------------------------------------------------------------
	// GET /messages (admin-only)
	// -----------------------------------------------------------------------

	describe('GET /messages', () => {
		it('should be blocked without an API key', async () => {
			const { response } = await client.GET('/messages', {
				headers: { 'Api-Key': '' }
			});
			expect(response.status).toBe(401);
		});

		it('should return a list of messages when authorized', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response, data } = await adminClient.GET('/messages');

			expect(response.status).toBe(200);
			expect(data?.success).toBe(true);
			expect(data?.data?.items).toBeDefined();
			expect(Array.isArray(data?.data?.items)).toBe(true);
			expect(data?.data?.pagination).toBeDefined();
		});

		it('should filter messages by sender email', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const email = `filter-${Math.random()}@example.com`;

			// Seed a specific message
			await client.POST('/messages', {
				params: { query: { notify: false } },
				body: { name: 'Filter Me', email, message: 'Target message' }
			});

			const { response, data } = await adminClient.GET('/messages', {
				params: { query: { senders: [email] } }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items).toBeDefined();
			expect(data?.data?.items?.every((m) => m.email === email)).toBe(true);
			expect(data?.data?.items?.length).toBeGreaterThanOrEqual(1);
		});

		it('should search messages by content', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const uniqueKeyword = `sharia-${Math.random()}`;

			await client.POST('/messages', {
				params: { query: { notify: false } },
				body: {
					name: 'Searcher',
					email: 'search@example.com',
					message: `This is a unique ${uniqueKeyword} message.`
				}
			});

			const { response, data } = await adminClient.GET('/messages', {
				params: { query: { search: uniqueKeyword } }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items).toBeDefined();
			expect(data?.data?.items?.length).toBe(1);
			expect(data?.data?.items?.[0].message).toContain(uniqueKeyword);
		});

		it('should handle pagination', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response, data } = await adminClient.GET('/messages', {
				params: { query: { limit: 1, page: 1 } }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items).toBeDefined();
			expect(data?.data?.items?.length).toBeLessThanOrEqual(1);
			expect(data?.data?.pagination?.limit).toBe(1);
			expect(data?.data?.pagination?.page).toBe(1);
		});
	});
});
