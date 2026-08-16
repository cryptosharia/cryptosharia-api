import { describe, expect, it, beforeEach } from 'vitest';

import { db } from '$lib/db';
import { tags as tagsTable } from '$lib/db/tables';
import { createApiTestClient } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tags API Integration - List', () => {
	beforeEach(async () => {
		await db.delete(tagsTable);
	});

	it('should list tags with pagination', async () => {
		await db.insert(tagsTable).values([
			{ name: 'Alpha Tag', slug: 'alpha-tag' },
			{ name: 'Beta Tag', slug: 'beta-tag' },
			{ name: 'Gamma Tag', slug: 'gamma-tag' }
		]);

		const { data, response } = await client.GET('/tags', {
			params: { query: { limit: 2, page: 1 } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(2);
		expect(data?.data?.pagination?.total).toBe(3);
		expect(data?.data?.pagination?.totalPages).toBe(2);
	});

	it('should filter tags by slugs', async () => {
		await db.insert(tagsTable).values([
			{ name: 'Alpha Tag', slug: 'alpha-tag' },
			{ name: 'Beta Tag', slug: 'beta-tag' }
		]);

		const { data, response } = await client.GET('/tags', {
			params: { query: { slugs: ['alpha-tag'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('alpha-tag');
	});

	it('should search tags by name or slug', async () => {
		await db.insert(tagsTable).values([
			{ name: 'Halal Crypto', slug: 'halal-crypto' },
			{ name: 'DeFi Protocol', slug: 'defi-protocol' }
		]);

		const { data, response } = await client.GET('/tags', {
			params: { query: { search: 'halal' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].name).toBe('Halal Crypto');
	});

	it('should return empty list when no tags match', async () => {
		const { data, response } = await client.GET('/tags', {
			params: { query: { search: 'nonexistent' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(0);
	});

	it('should return only visible content categories in display order', async () => {
		await db.insert(tagsTable).values([
			{ name: 'Later', slug: 'later', contentSection: 'news', showInNavigation: true, displayOrder: 2 },
			{ name: 'First', slug: 'first', contentSection: 'news', showInNavigation: true, displayOrder: 1 },
			{ name: 'Hidden', slug: 'hidden', contentSection: 'news', showInNavigation: false, displayOrder: 0 }
		]);

		const { data, response } = await client.GET('/tags', {
			params: { query: { contentSections: ['news'], showInNavigation: true, limit: 10, page: 1 } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items.map((tag) => tag.slug)).toEqual(['first', 'later']);
	});
});
