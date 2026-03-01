import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestToken } from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Tokens API Integration - Detail', () => {
	it('should exclude content in list results and include it in detail', async () => {
		await createTestToken({
			name: 'Detailed Token',
			ticker: 'DET',
			slug: 'detailed-token',
			content: 'Secret Content',
			rank: 10
		});

		const { data: listData, response: listResponse } = await guestClient.GET('/tokens');
		expect(listResponse.status).toBe(200);
		expect(listData?.data?.items?.[0]).not.toHaveProperty('content');

		const { data: singleData, response } = await guestClient.GET('/tokens/{id}', {
			params: { path: { id: 'detailed-token' } }
		});

		expect(response.status).toBe(200);
		expect(singleData?.data?.content).toBe('Secret Content');
	});

	it('should return 404 for non-existent token slug', async () => {
		const { response } = await guestClient.GET('/tokens/{id}', {
			params: { path: { id: 'non-existent' } }
		});

		expect(response.status).toBe(404);
	});

	it('should not allow finding a draft token by slug for guests', async () => {
		await createTestToken({
			slug: 'draft-token-slug',
			ticker: 'DRAFT',
			status: 'draft',
			rank: 1000
		});

		const { response } = await guestClient.GET('/tokens/{id}', {
			params: { path: { id: 'draft-token-slug' } }
		});

		expect(response.status).toBe(404);
	});

	it('should allow admin to find any token by UUID, including drafts', async () => {
		const token = await createTestToken({
			slug: 'admin-uuid-draft',
			ticker: 'AUD',
			status: 'draft',
			rank: 1001
		});
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data, response } = await adminClient.GET('/tokens/{id}', {
			params: { path: { id: token.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('admin-uuid-draft');
		expect(data?.data?.status).toBe('draft');
	});

	it.each([
		{ actor: 'guest', ticker: 'GUD', rank: 1002 },
		{ actor: 'member', ticker: 'MUD', rank: 1003 }
	] as const)(
		'should return 404 when $actor fetches draft token by UUID',
		async ({ actor, ticker, rank }) => {
			const token = await createTestToken({
				slug: `${actor}-uuid-draft`,
				ticker,
				status: 'draft',
				rank
			});
			const requestClient =
				actor === 'member' ? (await createAuthenticatedClient('member')).client : guestClient;

			const { response } = await requestClient.GET('/tokens/{id}', {
				params: { path: { id: token.id } }
			});

			expect(response.status).toBe(404);
		}
	);

	it('should allow guest to fetch published token by UUID', async () => {
		const token = await createTestToken({
			slug: 'guest-uuid-published',
			ticker: 'GUP',
			status: 'published',
			rank: 1004
		});

		const { data, response } = await guestClient.GET('/tokens/{id}', {
			params: { path: { id: token.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('guest-uuid-published');
	});

	it('should allow admins to preview draft token via slug', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const token = await createTestToken({ status: 'draft' });

		const { data, response } = await adminClient.GET('/tokens/{id}', {
			params: { path: { id: token.slug } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.id).toBe(token.id);
		expect(data?.data?.status).toBe('draft');
	});
});
