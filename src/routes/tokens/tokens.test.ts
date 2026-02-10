import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { tokens, assets } from '$lib/db/tables';
import { createApiTestClient } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tokens API Integration', () => {
	const seedData = [
		{
			name: 'Bitcoin',
			ticker: 'BTC',
			slug: 'bitcoin',
			shariaStatus: 'halal' as const,
			rank: 1,
			status: 'published' as const
		},
		{
			name: 'Ethereum',
			ticker: 'ETH',
			slug: 'ethereum',
			shariaStatus: 'halal' as const,
			rank: 2,
			status: 'published' as const
		},
		{
			name: 'XRP',
			ticker: 'XRP',
			slug: 'ripple',
			shariaStatus: 'syubhat' as const,
			rank: 5,
			status: 'published' as const
		},
		{
			name: 'Cardano',
			ticker: 'ADA',
			slug: 'cardano',
			shariaStatus: 'halal' as const,
			rank: 10,
			status: 'published' as const
		}
	];

	it('should filter tokens by sharia status', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: { shariaStatuses: ['syubhat'] }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].ticker).toBe('XRP');
	});

	it('should filter by multiple slugs', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: { slugs: ['bitcoin', 'ethereum'] }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.items?.map((i) => i.slug)).toContain('bitcoin');
		expect(data?.data?.items?.map((i) => i.slug)).toContain('ethereum');
	});

	it('should exclude specific slugs', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: { exclude: ['bitcoin', 'ripple'] }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.items?.map((i) => i.slug)).not.toContain('bitcoin');
		expect(data?.data?.items?.map((i) => i.slug)).not.toContain('ripple');
	});

	it('should search tokens by name or ticker', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: { search: 'ETH' }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].ticker).toBe('ETH');
	});

	it('should combine multiple filters (shariaStatuses AND search)', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: {
					shariaStatuses: ['halal'],
					search: 'Cardano'
				}
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('cardano');
	});

	it('should handle pagination', async () => {
		await db.insert(tokens).values(seedData);

		const { data, response } = await client.GET('/tokens', {
			params: {
				query: { limit: 2, page: 1 }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.pagination.total).toBe(4);
		expect(data?.data?.pagination.totalPages).toBe(2);
	});

	it('should exclude content from list results and include in single item', async () => {
		await db.insert(tokens).values({
			name: 'Detailed Token',
			ticker: 'DET',
			slug: 'detailed-token',
			shariaStatus: 'halal',
			rank: 10,
			status: 'published',
			content: 'Secret Content'
		});

		const { data: listData } = await client.GET('/tokens');
		expect(listData?.data?.items?.[0]).not.toHaveProperty('content');

		const { data: singleData, response: singleResponse } = await client.GET('/tokens/{slug}', {
			params: {
				path: { slug: 'detailed-token' }
			}
		});

		expect(singleResponse.status).toBe(200);
		expect(singleData?.data?.content).toBe('Secret Content');
	});

	it('should return 404 for non-existent token slug', async () => {
		const { response } = await client.GET('/tokens/{slug}', {
			params: {
				path: { slug: 'non-existent' }
			}
		});

		expect(response.status).toBe(404);
	});

	it('should filter tokens by status (including archived)', async () => {
		await db.insert(tokens).values([
			{
				name: 'Archived Coin',
				ticker: 'ARC',
				slug: 'archived-coin',
				shariaStatus: 'halal' as const,
				rank: 100,
				status: 'archived' as const
			}
		]);

		// 1. Default (should NOT return archived)
		const { data: defaultData } = await client.GET('/tokens');
		expect(defaultData?.data?.items?.some((i) => i.slug === 'archived-coin')).toBe(false);

		// 2. Explicit archive (should return archived)
		const { data: archiveData } = await client.GET('/tokens', {
			params: {
				query: { statuses: ['archived'] }
			}
		});
		expect(archiveData?.data?.items?.some((i) => i.slug === 'archived-coin')).toBe(true);
	});

	it('should include audit metadata as objects in response', async () => {
		await db.insert(tokens).values({
			name: 'Metadata Object Token',
			ticker: 'MTO',
			slug: 'meta-obj-token',
			shariaStatus: 'halal',
			rank: 1,
			status: 'published'
		});

		const { data } = await client.GET('/tokens');
		const item = data?.data?.items?.find((i) => i.slug === 'meta-obj-token');

		expect(item).toBeDefined();
		expect(item).toHaveProperty('createdAt');
		expect(item).toHaveProperty('updatedAt');

		// In our test environment, these might be null if no user is associated,
		// but if they exist, they MUST be objects with name and email.
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

	it('should NOT allow finding a draft token by slug', async () => {
		const slug = 'draft-token-slug';
		await db.insert(tokens).values({
			name: 'Draft Token',
			slug,
			ticker: 'DRAFT',
			status: 'draft',
			shariaStatus: 'syubhat',
			content: '...'
		});

		const { response } = await client.GET('/tokens/{slug}', {
			params: {
				path: { slug }
			}
		});

		expect(response.status).toBe(404);
	});

	it('should allow finding any token by UUID', async () => {
		const slug = 'internal-token-slug';
		const [token] = await db
			.insert(tokens)
			.values({
				name: 'Internal Token',
				slug,
				ticker: 'INT',
				status: 'draft',
				shariaStatus: 'syubhat',
				content: '...'
			})
			.returning({ id: tokens.id });

		const { data, response } = await client.GET('/tokens/{id}', {
			params: {
				path: { id: token.id }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe(slug);
		expect(data?.data?.status).toBe('draft');
	});

	it('should return final form for logo if assigned', async () => {
		// 1. Setup: Create an asset and a token referencing it
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

		const slug = 'token-with-logo';
		await db.insert(tokens).values({
			name: 'Token with Logo',
			ticker: 'TWL',
			slug,
			shariaStatus: 'halal',
			rank: 10,
			status: 'published',
			logoId: asset.id
		});

		// 2. Act
		const { data } = await client.GET('/tokens/{slug}', {
			params: { path: { slug } }
		});

		// 3. Assert
		const token = data?.data;
		expect(token?.logo).toBeDefined();
		expect(token?.logo?.id).toBe(asset.id);
		expect(token?.logo?.url).toContain('picsum.photos');
		expect(token?.logo?.url).toContain('test/path/logo.png');
	});
});
