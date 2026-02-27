import { describe, it, expect } from 'vitest';
import {
	createApiTestClient,
	createAuthenticatedClient,
	createTestAsset,
	createTestToken
} from '$lib/test-utils';
import { db } from '$lib/db';
import { assets, tokenTags, tags } from '$lib/db/tables';

const client = createApiTestClient();

async function attachTagToToken(tokenId: string, tagSlug: string, description?: string) {
	const [tag] = await db
		.insert(tags)
		.values({
			name: `Tag ${tagSlug}`,
			slug: tagSlug,
			description
		})
		.returning();

	await db.insert(tokenTags).values({ tokenId, tagId: tag.id });

	return tag;
}

describe('Tokens API Integration', () => {
	// -----------------------------------------------------------------------
	// List (GET /tokens)
	// -----------------------------------------------------------------------

	it('should filter tokens by sharia status', async () => {
		const asset = await createTestAsset();
		await createTestToken({
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			shariaStatus: 'halal',
			rank: 1,
			logoId: asset.id
		});
		await createTestToken({
			name: 'XRP',
			ticker: 'XRP',
			slug: 'ripple',
			shariaStatus: 'syubhat',
			rank: 5,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens', {
			params: { query: { shariaStatuses: ['syubhat'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].ticker).toBe('XRP');
	});

	it('should filter by multiple slugs', async () => {
		const asset = await createTestAsset();
		await createTestToken({
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			rank: 1,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Ethereum',
			ticker: 'ETH',
			slug: 'ethereum',
			rank: 2,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Cardano',
			ticker: 'ADA',
			slug: 'cardano',
			rank: 10,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens', {
			params: { query: { slugs: ['bitcoin', 'ethereum'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.items?.map((i) => i.slug)).toContain('bitcoin');
		expect(data?.data?.items?.map((i) => i.slug)).toContain('ethereum');
	});

	it('should exclude specific slugs', async () => {
		const asset = await createTestAsset();
		await createTestToken({
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			rank: 1,
			logoId: asset.id
		});
		await createTestToken({
			name: 'XRP',
			ticker: 'XRP',
			slug: 'ripple',
			rank: 5,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Ethereum',
			ticker: 'ETH',
			slug: 'ethereum',
			rank: 2,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens', {
			params: { query: { exclude: ['bitcoin', 'ripple'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.map((i) => i.slug)).not.toContain('bitcoin');
		expect(data?.data?.items?.map((i) => i.slug)).not.toContain('ripple');
	});

	it('should search tokens by name or ticker', async () => {
		const asset = await createTestAsset();
		await createTestToken({
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			rank: 1,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Ethereum',
			ticker: 'ETH',
			slug: 'ethereum',
			rank: 2,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens', {
			params: { query: { search: 'ETH' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].ticker).toBe('ETH');
	});

	it('should combine multiple filters (shariaStatuses AND search)', async () => {
		const asset = await createTestAsset();
		await createTestToken({
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			shariaStatus: 'halal',
			rank: 1,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Cardano',
			ticker: 'ADA',
			slug: 'cardano',
			shariaStatus: 'halal',
			rank: 10,
			logoId: asset.id
		});
		await createTestToken({
			name: 'XRP',
			ticker: 'XRP',
			slug: 'ripple',
			shariaStatus: 'syubhat',
			rank: 5,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens', {
			params: { query: { shariaStatuses: ['halal'], search: 'Cardano' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('cardano');
	});

	it('should handle pagination', async () => {
		const asset = await createTestAsset();
		for (let i = 0; i < 4; i++) {
			await createTestToken({
				name: `Token ${i}`,
				ticker: `T${i}`,
				slug: `token-${i}`,
				rank: i + 1,
				logoId: asset.id
			});
		}

		const { data, response } = await client.GET('/tokens', {
			params: { query: { limit: 2, page: 1 } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.pagination.total).toBe(4);
		expect(data?.data?.pagination.totalPages).toBe(2);
	});

	it('should include tags in list response and filter tokens by tags query', async () => {
		const asset = await createTestAsset();
		const taggedToken = await createTestToken({
			name: 'Tagged Token',
			ticker: 'TAGL',
			slug: 'tagged-token',
			rank: 20,
			logoId: asset.id
		});
		await createTestToken({
			name: 'Untagged Token',
			ticker: 'UNTG',
			slug: 'untagged-token',
			rank: 21,
			logoId: asset.id
		});
		await attachTagToToken(taggedToken.id, 'defi');

		const { data, response } = await client.GET('/tokens', {
			params: { query: { tags: ['defi'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('tagged-token');
		expect(data?.data?.items?.[0].tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'Tag defi',
					slug: 'defi'
				})
			])
		);
	});

	it('should return empty list when tags query does not match any token', async () => {
		await createTestToken({ slug: 'non-matching-token', ticker: 'NMTK', rank: 30 });

		const { data, response } = await client.GET('/tokens', {
			params: { query: { tags: ['non-existent-tag'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(0);
	});

	// -----------------------------------------------------------------------
	// Detail by Slug (GET /tokens/{slug})
	// -----------------------------------------------------------------------

	it('should exclude content from list results and include in single item', async () => {
		await createTestToken({
			name: 'Detailed Token',
			ticker: 'DET',
			slug: 'detailed-token',
			content: 'Secret Content',
			rank: 10
		});

		const { data: listData } = await client.GET('/tokens');
		expect(listData?.data?.items?.[0]).not.toHaveProperty('content');

		const { data: singleData, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'detailed-token' } }
		});

		expect(response.status).toBe(200);
		expect(singleData?.data?.content).toBe('Secret Content');
	});

	it('should return 404 for non-existent token slug', async () => {
		const { response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'non-existent' } }
		});
		expect(response.status).toBe(404);
	});

	it('should NOT allow finding a draft token by slug', async () => {
		await createTestToken({
			slug: 'draft-token-slug',
			ticker: 'DRAFT',
			status: 'draft',
			rank: 1000
		});

		const { response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'draft-token-slug' } }
		});
		expect(response.status).toBe(404);
	});

	// -----------------------------------------------------------------------
	// Status / Permission Filtering (GET /tokens with statuses)
	// -----------------------------------------------------------------------

	it('should filter tokens by status (restricting non-published for unauthorized)', async () => {
		await createTestToken({
			name: 'Archived Coin',
			ticker: 'ARC',
			slug: 'archived-coin',
			status: 'archived',
			rank: 100
		});

		// 1. Guest — should NOT return archived
		const { data: defaultData, response: defaultResponse } = await client.GET('/tokens');
		expect(defaultResponse.status).toBe(200);
		expect(defaultData?.data?.items?.some((i) => i.slug === 'archived-coin')).toBe(false);

		// 2. Guest explicit archived — should return 403
		const { response: archiveResponse } = await client.GET('/tokens', {
			params: { query: { statuses: ['archived'] } }
		});
		expect(archiveResponse.status).toBe(403);

		// 3. Admin — should return archived
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data: adminData } = await adminClient.GET('/tokens', {
			params: { query: { statuses: ['archived'] } }
		});
		expect(adminData?.data?.items?.some((i) => i.slug === 'archived-coin')).toBe(true);

		// 4. Admin no filter — should return ALL statuses
		const { data: adminAllData } = await adminClient.GET('/tokens');
		expect(adminAllData?.data?.items?.some((i) => i.slug === 'archived-coin')).toBe(true);

		// 5. Member — should return 403 for archived filter
		const { client: memberClient } = await createAuthenticatedClient('member');

		const forbiddenCases = [
			{ requestClient: memberClient, statuses: ['archived'] as const },
			{ requestClient: client, statuses: ['published', 'archived'] as const }
		];

		for (const { requestClient, statuses } of forbiddenCases) {
			const { response } = await requestClient.GET('/tokens', {
				params: { query: { statuses: [...statuses] } }
			});
			expect(response.status).toBe(403);
		}
	});

	// -----------------------------------------------------------------------
	// Detail by UUID (GET /tokens/{id}) — SEC-2 coverage
	// -----------------------------------------------------------------------

	it('should allow admin to find any token by UUID (including drafts)', async () => {
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
				actor === 'member' ? (await createAuthenticatedClient('member')).client : client;

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

		const { data, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: token.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('guest-uuid-published');
	});

	// -----------------------------------------------------------------------
	// Metadata & Assets
	// -----------------------------------------------------------------------

	it('should include audit metadata as objects in response', async () => {
		await createTestToken({
			name: 'Metadata Object Token',
			ticker: 'MTO',
			slug: 'meta-obj-token',
			rank: 1
		});

		const { data } = await client.GET('/tokens');
		const item = data?.data?.items?.find((i) => i.slug === 'meta-obj-token');

		expect(item).toBeDefined();
		expect(item).toHaveProperty('createdAt');
		expect(item).toHaveProperty('updatedAt');

		if (item?.createdBy) {
			expect(typeof item.createdBy).toBe('object');
			expect(item.createdBy).toHaveProperty('id');
			expect(item.createdBy).toHaveProperty('name');
			expect(item.createdBy).toHaveProperty('email');
		}

		if (item?.updatedBy) {
			expect(typeof item.updatedBy).toBe('object');
			expect(item.updatedBy).toHaveProperty('id');
			expect(item.updatedBy).toHaveProperty('name');
			expect(item.updatedBy).toHaveProperty('email');
		}
	});

	it('should return final form for logo if assigned', async () => {
		const [asset] = await db
			.insert(assets)
			.values({
				pathname: 'test/path/logo.png',
				filename: 'logo.png',
				size: 512,
				mimeType: 'image/png',
				provider: 'picsum',
				width: 128,
				height: 128
			})
			.returning();

		await createTestToken({
			name: 'Token with Logo',
			ticker: 'TWL',
			slug: 'token-with-logo',
			rank: 10,
			logoId: asset.id
		});

		const { data } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'token-with-logo' } }
		});

		const token = data?.data;
		expect(token?.logo).toBeDefined();
		expect(token?.logo?.id).toBe(asset.id);
		expect(token?.logo?.url).toContain('picsum.photos');
		expect(token?.logo?.url).toContain('test/path/logo.png');
	});

	it('should include tag description in detail response', async () => {
		const token = await createTestToken({
			name: 'Token with Tag Description',
			ticker: 'TDSC',
			slug: 'token-with-tag-description',
			rank: 31
		});
		await attachTagToToken(token.id, 'platform', 'Tag for platform ecosystem tokens');

		const { data, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'token-with-tag-description' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					slug: 'platform',
					description: 'Tag for platform ecosystem tokens'
				})
			])
		);
	});

	it('should allow admins to preview draft token via slug', async () => {
		const { client } = await createAuthenticatedClient('admin');
		const token = await createTestToken({ status: 'draft' });

		const { data, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: token.slug } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.id).toBe(token.id);
		expect(data?.data?.status).toBe('draft');
	});
});
