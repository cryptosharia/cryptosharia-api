import { describe, it, expect } from 'vitest';
import { db } from '$lib/db';
import { posts, assets } from '$lib/db/tables';
import { createApiTestClient, createTestAsset } from '$lib/test-utils';

// Create a type-safe client
const client = createApiTestClient();

describe('Posts API Integration', () => {
	it('should filter posts by news section', async () => {
		// 1. Setup: Seed database
		const asset = await createTestAsset();
		await db.insert(posts).values([
			{
				title: 'Crypto News Today',
				slug: 'crypto-news-today',
				section: 'news',
				type: 'article',
				status: 'published' as const,
				content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
				excerpt: 'Summary of news.',
				coverImageId: asset.id
			},
			{
				title: 'Learn SvelteKit',
				slug: 'learn-sveltekit',
				section: 'education',
				type: 'article',
				status: 'published' as const,
				content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
				excerpt: 'Summary of education.',
				coverImageId: asset.id
			}
		]);

		// 2. Act: Use the clean, type-safe openapi-fetch client
		const { data, response } = await client.GET('/posts', {
			params: {
				query: { sections: ['news'] }
			}
		});

		// 3. Assert
		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].section).toBe('news');
	});

	it('should return empty array when no posts match filters', async () => {
		const { data, response } = await client.GET('/posts', {
			params: {
				query: { sections: ['research'] }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(0);
	});

	it('should search posts by title', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values({
			title: 'Unique Secret Topic',
			slug: 'unique-topic',
			section: 'news',
			type: 'article',
			status: 'published' as const,
			content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
			excerpt: 'Summary of secret topic.',
			coverImageId: asset.id
		});

		const { data } = await client.GET('/posts', {
			params: {
				query: { search: 'Secret' }
			}
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].title).toContain('Unique Secret Topic');
	});

	it('should combine multiple filters (sections AND search)', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values([
			{
				title: 'Bitcoin in Activity',
				slug: 'btc-activity',
				section: 'activity',
				type: 'article',
				status: 'published' as const,
				content: '...',
				excerpt: 'Summary of activity.',
				coverImageId: asset.id
			},
			{
				title: 'Bitcoin in News',
				slug: 'btc-news',
				section: 'news',
				type: 'article',
				status: 'published' as const,
				content: '...',
				excerpt: 'Summary of news.',
				coverImageId: asset.id
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

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('btc-activity');
	});

	it('should search posts by excerpt', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values({
			title: 'A Post Title',
			slug: 'post-with-excerpt',
			section: 'news',
			type: 'article',
			excerpt: 'This is a unique SummaryKeyword that should be found.',
			status: 'published' as const,
			content: '...',
			coverImageId: asset.id
		});

		const { data } = await client.GET('/posts', {
			params: {
				query: { search: 'SummaryKeyword' }
			}
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('post-with-excerpt');
	});

	it('should handle pagination (limit and page)', async () => {
		// Insert 5 posts
		const asset = await createTestAsset();
		const mockPosts = Array.from({ length: 5 }).map((_, i) => ({
			title: `Post ${i + 1}`,
			slug: `post-${i + 1}`,
			section: 'news' as const,
			type: 'article' as const,
			status: 'published' as const,
			content: '...',
			excerpt: `Excerpt ${i + 1}`,
			coverImageId: asset.id
		}));

		await db.insert(posts).values(mockPosts);

		// Page 1, Limit 2
		const page1 = await client.GET('/posts', {
			params: { query: { limit: 2, page: 1 } }
		});

		expect(page1.data?.data?.items).toHaveLength(2);
		expect(page1.data?.data?.pagination.total).toBeGreaterThanOrEqual(5);

		// Page 3, Limit 2 (should only have 1 item left)
		const page3 = await client.GET('/posts', {
			params: { query: { limit: 2, page: 3 } }
		});

		expect(page3.data?.data?.items).toHaveLength(1);
		expect(page3.data?.data?.pagination.totalPages).toBeGreaterThanOrEqual(3);
	});

	it('should exclude specific slugs', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values([
			{
				title: 'Post A',
				slug: 'post-a',
				section: 'news',
				type: 'article',
				status: 'published' as const,
				content: '...',
				excerpt: 'Summary A',
				coverImageId: asset.id
			},
			{
				title: 'Post B',
				slug: 'post-b',
				section: 'news',
				type: 'article',
				status: 'published' as const,
				content: '...',
				excerpt: 'Summary B',
				coverImageId: asset.id
			}
		]);

		const { data } = await client.GET('/posts', {
			params: {
				query: { exclude: ['post-a'] }
			}
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('post-b');
	});

	it('should get a single post by slug', async () => {
		const asset = await createTestAsset();
		const testPost = {
			title: 'Single Post Test',
			slug: 'single-post-test',
			section: 'news' as const,
			type: 'article' as const,
			status: 'published' as const,
			content: 'This is a single post content.',
			excerpt: 'Summary of single post.',
			coverImageId: asset.id
		};

		await db.insert(posts).values(testPost);

		const { data, response } = await client.GET('/posts/{slug}', {
			params: {
				path: { slug: testPost.slug }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data).toBeDefined();
		expect(data?.data?.slug).toBe(testPost.slug);
		expect(data?.data?.title).toBe(testPost.title);
	});

	it('should return 404 for non-existent post slug', async () => {
		const { response } = await client.GET('/posts/{slug}', {
			params: {
				path: { slug: 'non-existent-slug' }
			}
		});

		expect(response.status).toBe(404);
	});

	it('should exclude content field from list but include it in single post', async () => {
		const asset = await createTestAsset();
		const testSlug = 'content-test-post';
		await db.insert(posts).values({
			title: 'Content Test',
			slug: testSlug,
			section: 'news',
			type: 'article',
			status: 'published' as const,
			content: 'This secret content should not be in the list!',
			excerpt: 'Summary of content test.',
			coverImageId: asset.id
		});

		// 1. Verify it's NOT in the list
		const { data: listData } = await client.GET('/posts');
		const item = listData?.data?.items.find((i) => i.slug === testSlug);
		expect(item).toBeDefined();
		expect(item).not.toHaveProperty('content');

		// 2. Verify it IS in the single post retrieval
		const { data: singleData } = await client.GET('/posts/{slug}', {
			params: {
				path: { slug: testSlug }
			}
		});
		expect(singleData?.data?.content).toBeDefined();
		expect(singleData?.data?.content).toBe('This secret content should not be in the list!');
	});

	it('should filter posts by status (including draft for authorized users)', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values([
			{
				title: 'Published Post',
				slug: 'published-post',
				section: 'news',
				type: 'article',
				status: 'published' as const,
				content: '...',
				excerpt: 'Summary of published.',
				coverImageId: asset.id
			},
			{
				title: 'Draft Post',
				slug: 'draft-post',
				section: 'news',
				type: 'article',
				status: 'draft' as const,
				content: '...',
				excerpt: 'Summary of draft.',
				coverImageId: asset.id
			}
		]);

		// 1. Default (should only return published)
		const { data: defaultData } = await client.GET('/posts');
		expect(defaultData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(false);

		// 2. Explicit draft (should return draft)
		const { data: draftData } = await client.GET('/posts', {
			params: {
				query: { statuses: ['draft'] }
			}
		});
		expect(draftData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(true);
		expect(draftData?.data?.items?.some((i) => i.slug === 'published-post')).toBe(false);

		// 3. Both
		const { data: bothData } = await client.GET('/posts', {
			params: {
				query: { statuses: ['published', 'draft'] }
			}
		});
		expect(bothData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(true);
		expect(bothData?.data?.items?.some((i) => i.slug === 'published-post')).toBe(true);
	});

	it('should include audit metadata as objects in response', async () => {
		const asset = await createTestAsset();
		await db.insert(posts).values({
			title: 'Metadata Object Test',
			slug: 'metadata-obj-test',
			section: 'news',
			type: 'article',
			status: 'published',
			content: '...',
			excerpt: 'Summary of metadata test.',
			coverImageId: asset.id
		});

		const { data } = await client.GET('/posts');
		const item = data?.data?.items?.find((i) => i.slug === 'metadata-obj-test');

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

	it('should find any post by UUID using the uuid matcher', async () => {
		const slug = 'matcher-draft-slug';
		const asset = await createTestAsset();
		const [post] = await db
			.insert(posts)
			.values({
				title: 'Matcher Draft Test',
				slug,
				section: 'news',
				type: 'article',
				status: 'draft',
				content: '...',
				excerpt: 'Summary of matcher test.',
				coverImageId: asset.id
			})
			.returning({ id: posts.id });

		// Test UUID lookup (should match [id=uuid])
		const { data, response } = await client.GET('/posts/{id}', {
			params: {
				path: { id: post.id }
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe(slug);
		expect(data?.data?.status).toBe('draft');
	});

	it('should NOT allow finding a draft by slug (falls through to [slug])', async () => {
		const asset = await createTestAsset();
		const slug = 'matcher-draft-slug-2';
		await db.insert(posts).values({
			title: 'Matcher Draft Test 2',
			slug,
			section: 'news',
			type: 'article',
			status: 'draft',
			content: '...',
			excerpt: 'Summary of matcher test 2.',
			coverImageId: asset.id
		});

		// Test Slug lookup (should match [slug] but return 404 because status is draft)
		const { response } = await client.GET('/posts/{slug}', {
			params: {
				path: { slug }
			}
		});

		expect(response.status).toBe(404);
	});

	it('should return final form for coverImage if assigned', async () => {
		// 1. Setup: Create an asset and a post referencing it
		const [asset] = await db
			.insert(assets)
			.values({
				pathname: 'test/path/image.jpg',
				filename: 'image.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				provider: 'picsum',
				width: 800,
				height: 600
			})
			.returning();

		const slug = 'post-with-image';
		await db.insert(posts).values({
			title: 'Post with Image',
			slug,
			section: 'news',
			type: 'article',
			status: 'published',
			content: '...',
			excerpt: 'Summary of image post.',
			coverImageId: asset.id
		});

		// 2. Act
		const { data } = await client.GET('/posts/{slug}', {
			params: { path: { slug } }
		});

		// 3. Assert
		const post = data?.data;
		expect(post?.coverImage).toBeDefined();
		expect(post?.coverImage?.id).toBe(asset.id);
		expect(post?.coverImage?.url).toContain('picsum.photos');
		expect(post?.coverImage?.url).toContain('test/path/image.jpg');
	});
});
