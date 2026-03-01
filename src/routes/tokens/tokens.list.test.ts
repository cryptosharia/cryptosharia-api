import { describe, expect, it } from 'vitest';

import { attachTagToToken } from '$lib/test-scenarios/tag-relations';
import { createApiTestClient, createTestAsset, createTestToken } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tokens API Integration - List', () => {
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
		expect(data?.data?.items?.map((item) => item.slug)).toContain('bitcoin');
		expect(data?.data?.items?.map((item) => item.slug)).toContain('ethereum');
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
		expect(data?.data?.items?.map((item) => item.slug)).not.toContain('bitcoin');
		expect(data?.data?.items?.map((item) => item.slug)).not.toContain('ripple');
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

	it('should combine sharia status and search filters', async () => {
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

	it('should include tags and filter tokens by tags query', async () => {
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
});
