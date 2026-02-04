import { describe, it, expect } from 'vitest';
import * as PostsAPI from './+server';
import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { createApiTestClient, createTestAdmin } from '$lib/test-utils';
import type { RequestEvent } from './$types';

// Create a type-safe client that talks directly to the whole module
const client = createApiTestClient<RequestEvent>(PostsAPI);

describe('Posts API Integration', () => {
	it('should filter posts by news section', async () => {
		// 1. Setup: Create admin
		const admin = await createTestAdmin();

		// 2. Setup: Seed database
		await db.insert(posts).values([
			{
				title: 'Crypto News Today',
				slug: 'crypto-news-today',
				section: 'news',
				type: 'article',
				content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
				createdBy: admin.id
			},
			{
				title: 'Learn SvelteKit',
				slug: 'learn-sveltekit',
				section: 'education',
				type: 'article',
				content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
				createdBy: admin.id
			}
		]);

		// 3. Act: Use the clean, type-safe openapi-fetch client
		const { data, response } = await client.GET('/posts', {
			params: {
				query: { sections: ['news'] }
			}
		});

		// 4. Assert
		expect(response.status).toBe(200);
		expect(data?.data).toHaveLength(1);
		expect(data?.data[0].section).toBe('news');
	});

	it('should return empty array when no posts match filters', async () => {
		const { data, response } = await client.GET('/posts', {
			params: {
				query: { sections: ['research'] }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data).toHaveLength(0);
	});

	it('should search posts by title', async () => {
		const admin = await createTestAdmin();

		await db.insert(posts).values({
			title: 'Unique Secret Topic',
			slug: 'unique-topic',
			section: 'news',
			type: 'article',
			content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
			createdBy: admin.id
		});

		const { data } = await client.GET('/posts', {
			params: {
				query: { search: 'Secret' }
			}
		});

		expect(data?.data).toHaveLength(1);
		expect(data?.data?.[0].title).toContain('Unique Secret Topic');
	});

	it('should combine multiple filters (sections AND search)', async () => {
		const admin = await createTestAdmin();

		await db.insert(posts).values([
			{
				title: 'Bitcoin in Activity',
				slug: 'btc-activity',
				section: 'activity',
				type: 'article',
				content: '...',
				createdBy: admin.id
			},
			{
				title: 'Bitcoin in News',
				slug: 'btc-news',
				section: 'news',
				type: 'article',
				content: '...',
				createdBy: admin.id
			}
		]);

		const { data } = await client.GET('/posts', {
			params: {
				query: {
					sections: ['activity'],
					search: 'Bitcoin'
				}
			}
		});

		expect(data?.data).toHaveLength(1);
		expect(data?.data?.[0].slug).toBe('btc-activity');
	});

	it('should search posts by excerpt', async () => {
		const admin = await createTestAdmin();

		await db.insert(posts).values({
			title: 'A Post Title',
			slug: 'post-with-excerpt',
			section: 'news',
			type: 'article',
			excerpt: 'This is a unique SummaryKeyword that should be found.',
			content: '...',
			createdBy: admin.id
		});

		const { data } = await client.GET('/posts', {
			params: {
				query: { search: 'SummaryKeyword' }
			}
		});

		expect(data?.data).toHaveLength(1);
		expect(data?.data?.[0].slug).toBe('post-with-excerpt');
	});

	it('should handle pagination (limit and page)', async () => {
		const admin = await createTestAdmin();

		// Insert 5 posts
		const mockPosts = Array.from({ length: 5 }).map((_, i) => ({
			title: `Post ${i + 1}`,
			slug: `post-${i + 1}`,
			section: 'news' as const,
			type: 'article' as const,
			content: '...',
			createdBy: admin.id
		}));

		await db.insert(posts).values(mockPosts);

		// Page 1, Limit 2
		const page1 = await client.GET('/posts', {
			params: { query: { limit: 2, page: 1 } }
		});

		expect(page1.data?.data).toHaveLength(2);

		// Page 3, Limit 2 (should only have 1 item left)
		const page3 = await client.GET('/posts', {
			params: { query: { limit: 2, page: 3 } }
		});

		expect(page3.data?.data).toHaveLength(1);
	});

	it('should exclude specific slugs', async () => {
		const admin = await createTestAdmin();

		await db.insert(posts).values([
			{
				title: 'Post A',
				slug: 'post-a',
				section: 'news',
				type: 'article',
				content: '...',
				createdBy: admin.id
			},
			{
				title: 'Post B',
				slug: 'post-b',
				section: 'news',
				type: 'article',
				content: '...',
				createdBy: admin.id
			}
		]);

		const { data } = await client.GET('/posts', {
			params: {
				query: { exclude: ['post-a'] }
			}
		});

		expect(data?.data).toHaveLength(1);
		expect(data?.data?.[0].slug).toBe('post-b');
	});
});
