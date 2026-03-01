import { describe, expect, it } from 'vitest';

import { attachTagToPost } from '$lib/test-scenarios/tag-relations';
import { createApiTestClient, createTestAsset, createTestPost } from '$lib/test-utils';

const client = createApiTestClient();

describe('Posts API Integration - List', () => {
	it('should filter posts by section', async () => {
		const asset = await createTestAsset();
		await createTestPost({
			title: 'News Post',
			slug: 'news-post',
			section: 'news',
			coverImageId: asset.id
		});
		await createTestPost({
			title: 'Education Post',
			slug: 'edu-post',
			section: 'education',
			coverImageId: asset.id
		});

		const { data, response } = await client.GET('/posts', {
			params: { query: { sections: ['news'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].section).toBe('news');
	});

	it('should return empty array when no posts match filters', async () => {
		const { data, response } = await client.GET('/posts', {
			params: { query: { sections: ['research'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(0);
	});

	it('should search posts by title', async () => {
		await createTestPost({ title: 'Unique Secret Topic', slug: 'unique-topic' });

		const { data, response } = await client.GET('/posts', {
			params: { query: { search: 'Secret' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].title).toContain('Unique Secret Topic');
	});

	it('should search posts by excerpt', async () => {
		await createTestPost({
			title: 'Excerpt Search Post',
			slug: 'excerpt-search',
			excerpt: 'This is a unique SummaryKeyword that should be found.'
		});

		const { data, response } = await client.GET('/posts', {
			params: { query: { search: 'SummaryKeyword' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('excerpt-search');
	});

	it('should combine section and search filters', async () => {
		const asset = await createTestAsset();
		await createTestPost({
			title: 'Bitcoin in Activity',
			slug: 'btc-activity',
			section: 'activity',
			coverImageId: asset.id
		});
		await createTestPost({
			title: 'Bitcoin in News',
			slug: 'btc-news',
			section: 'news',
			coverImageId: asset.id
		});

		const { data, response } = await client.GET('/posts', {
			params: { query: { sections: ['activity'], search: 'Bitcoin' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('btc-activity');
	});

	it('should handle pagination with limit and page', async () => {
		const asset = await createTestAsset();
		for (let i = 0; i < 5; i++) {
			await createTestPost({
				title: `Paginated ${i}`,
				slug: `paginated-${i}`,
				coverImageId: asset.id
			});
		}

		const page1 = await client.GET('/posts', { params: { query: { limit: 2, page: 1 } } });
		expect(page1.response.status).toBe(200);
		expect(page1.data?.data?.items).toHaveLength(2);
		expect(page1.data?.data?.pagination.total).toBeGreaterThanOrEqual(5);

		const page3 = await client.GET('/posts', { params: { query: { limit: 2, page: 3 } } });
		expect(page3.response.status).toBe(200);
		expect(page3.data?.data?.items).toHaveLength(1);
		expect(page3.data?.data?.pagination.totalPages).toBeGreaterThanOrEqual(3);
	});

	it('should exclude specific slugs', async () => {
		const asset = await createTestAsset();
		await createTestPost({ title: 'Post A', slug: 'post-a', coverImageId: asset.id });
		await createTestPost({ title: 'Post B', slug: 'post-b', coverImageId: asset.id });

		const { data, response } = await client.GET('/posts', {
			params: { query: { exclude: ['post-a'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('post-b');
	});

	it('should include tags and filter posts by tags query', async () => {
		const asset = await createTestAsset();
		const taggedPost = await createTestPost({
			slug: 'post-with-education-tag',
			coverImageId: asset.id
		});
		await createTestPost({ slug: 'post-without-education-tag', coverImageId: asset.id });
		await attachTagToPost(taggedPost.id, 'education');

		const { data, response } = await client.GET('/posts', {
			params: { query: { tags: ['education'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('post-with-education-tag');
		expect(data?.data?.items?.[0].tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'Tag education',
					slug: 'education'
				})
			])
		);
	});

	it('should return empty list when tags query does not match any post', async () => {
		await createTestPost({ slug: 'unmatched-post' });

		const { data, response } = await client.GET('/posts', {
			params: { query: { tags: ['non-existent-tag'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(0);
	});
});
