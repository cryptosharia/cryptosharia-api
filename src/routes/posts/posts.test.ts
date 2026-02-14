import { describe, it, expect } from 'vitest';
import {
	createApiTestClient,
	createAuthenticatedClient,
	createTestAsset,
	createTestPost
} from '$lib/test-utils';
import { db } from '$lib/db';
import { posts, assets } from '$lib/db/tables';

const client = createApiTestClient();

describe('Posts API Integration', () => {
	// -----------------------------------------------------------------------
	// List (GET /posts)
	// -----------------------------------------------------------------------

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

		const { data } = await client.GET('/posts', {
			params: { query: { search: 'Secret' } }
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].title).toContain('Unique Secret Topic');
	});

	it('should search posts by excerpt', async () => {
		await createTestPost({
			title: 'Excerpt Search Post',
			slug: 'excerpt-search',
			excerpt: 'This is a unique SummaryKeyword that should be found.'
		});

		const { data } = await client.GET('/posts', {
			params: { query: { search: 'SummaryKeyword' } }
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('excerpt-search');
	});

	it('should combine multiple filters (sections AND search)', async () => {
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

		const { data } = await client.GET('/posts', {
			params: { query: { sections: ['activity'], search: 'Bitcoin' } }
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('btc-activity');
	});

	it('should handle pagination (limit and page)', async () => {
		const asset = await createTestAsset();
		for (let i = 0; i < 5; i++) {
			await createTestPost({
				title: `Paginated ${i}`,
				slug: `paginated-${i}`,
				coverImageId: asset.id
			});
		}

		const page1 = await client.GET('/posts', { params: { query: { limit: 2, page: 1 } } });
		expect(page1.data?.data?.items).toHaveLength(2);
		expect(page1.data?.data?.pagination.total).toBeGreaterThanOrEqual(5);

		const page3 = await client.GET('/posts', { params: { query: { limit: 2, page: 3 } } });
		expect(page3.data?.data?.items).toHaveLength(1);
		expect(page3.data?.data?.pagination.totalPages).toBeGreaterThanOrEqual(3);
	});

	it('should exclude specific slugs', async () => {
		const asset = await createTestAsset();
		await createTestPost({ title: 'Post A', slug: 'post-a', coverImageId: asset.id });
		await createTestPost({ title: 'Post B', slug: 'post-b', coverImageId: asset.id });

		const { data } = await client.GET('/posts', {
			params: { query: { exclude: ['post-a'] } }
		});

		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items?.[0].slug).toBe('post-b');
	});

	// -----------------------------------------------------------------------
	// Detail by Slug (GET /posts/{slug})
	// -----------------------------------------------------------------------

	it('should get a single post by slug', async () => {
		await createTestPost({ title: 'Single Post Test', slug: 'single-post-test' });

		const { data, response } = await client.GET('/posts/{slug}', {
			params: { path: { slug: 'single-post-test' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('single-post-test');
		expect(data?.data?.title).toBe('Single Post Test');
	});

	it('should return 404 for non-existent post slug', async () => {
		const { response } = await client.GET('/posts/{slug}', {
			params: { path: { slug: 'non-existent-slug' } }
		});
		expect(response.status).toBe(404);
	});

	it('should exclude content field from list but include it in single post', async () => {
		await createTestPost({
			title: 'Content Test',
			slug: 'content-test-post',
			content: 'This secret content should not be in the list!'
		});

		// List should NOT have content
		const { data: listData } = await client.GET('/posts');
		const item = listData?.data?.items.find((i) => i.slug === 'content-test-post');
		expect(item).toBeDefined();
		expect(item).not.toHaveProperty('content');

		// Single should have content
		const { data: singleData } = await client.GET('/posts/{slug}', {
			params: { path: { slug: 'content-test-post' } }
		});
		expect(singleData?.data?.content).toBe('This secret content should not be in the list!');
	});

	it('should NOT allow finding a draft by slug (falls through to [slug])', async () => {
		await createTestPost({ slug: 'draft-slug-test', status: 'draft' });

		const { response } = await client.GET('/posts/{slug}', {
			params: { path: { slug: 'draft-slug-test' } }
		});
		expect(response.status).toBe(404);
	});

	// -----------------------------------------------------------------------
	// Status / Permission Filtering (GET /posts with statuses)
	// -----------------------------------------------------------------------

	it('should filter posts by status (restricting non-published for unauthorized)', async () => {
		const asset = await createTestAsset();
		await createTestPost({
			title: 'Published Post',
			slug: 'published-post',
			status: 'published',
			coverImageId: asset.id
		});
		await createTestPost({
			title: 'Draft Post',
			slug: 'draft-post',
			status: 'draft',
			coverImageId: asset.id
		});

		// 1. Guest — should only return published
		const { data: defaultData, response: defaultResponse } = await client.GET('/posts');
		expect(defaultResponse.status).toBe(200);
		expect(defaultData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(false);

		// 2. Guest explicit draft — should return 403
		const { response: draftResponse } = await client.GET('/posts', {
			params: { query: { statuses: ['draft'] } }
		});
		expect(draftResponse.status).toBe(403);

		// 3. Admin — should return drafts
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data: adminData } = await adminClient.GET('/posts', {
			params: { query: { statuses: ['draft'] } }
		});
		expect(adminData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(true);

		// 4. Admin no filter — should return ALL statuses
		const { data: adminAllData } = await adminClient.GET('/posts');
		expect(adminAllData?.data?.items?.some((i) => i.slug === 'published-post')).toBe(true);
		expect(adminAllData?.data?.items?.some((i) => i.slug === 'draft-post')).toBe(true);

		// 5. Member — should return 403 for draft filter
		const { client: memberClient } = await createAuthenticatedClient('member');
		const { response: memberResponse } = await memberClient.GET('/posts', {
			params: { query: { statuses: ['draft'] } }
		});
		expect(memberResponse.status).toBe(403);

		// 6. Guest mixed statuses — should return 403
		const { response: mixedResponse } = await client.GET('/posts', {
			params: { query: { statuses: ['published', 'draft'] } }
		});
		expect(mixedResponse.status).toBe(403);
	});

	// -----------------------------------------------------------------------
	// Detail by UUID (GET /posts/{id}) — SEC-2 coverage
	// -----------------------------------------------------------------------

	it('should allow admin to find any post by UUID (including drafts)', async () => {
		const post = await createTestPost({ slug: 'admin-uuid-draft', status: 'draft' });
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data, response } = await adminClient.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('admin-uuid-draft');
		expect(data?.data?.status).toBe('draft');
	});

	it('should return 404 when guest fetches draft post by UUID', async () => {
		const post = await createTestPost({ slug: 'guest-uuid-draft', status: 'draft' });

		const { response } = await client.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(404);
	});

	it('should return 404 when member fetches draft post by UUID', async () => {
		const post = await createTestPost({ slug: 'member-uuid-draft', status: 'draft' });
		const { client: memberClient } = await createAuthenticatedClient('member');

		const { response } = await memberClient.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(404);
	});

	it('should allow guest to fetch published post by UUID', async () => {
		const post = await createTestPost({ slug: 'guest-uuid-published', status: 'published' });

		const { data, response } = await client.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('guest-uuid-published');
	});

	// -----------------------------------------------------------------------
	// Metadata & Assets
	// -----------------------------------------------------------------------

	it('should include audit metadata as objects in response', async () => {
		await createTestPost({ title: 'Metadata Object Test', slug: 'metadata-obj-test' });

		const { data } = await client.GET('/posts');
		const item = data?.data?.items?.find((i) => i.slug === 'metadata-obj-test');

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

	it('should return final form for coverImage if assigned', async () => {
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

		await createTestPost({
			title: 'Post with Image',
			slug: 'post-with-image',
			coverImageId: asset.id
		});

		const { data } = await client.GET('/posts/{slug}', {
			params: { path: { slug: 'post-with-image' } }
		});

		const post = data?.data;
		expect(post?.coverImage).toBeDefined();
		expect(post?.coverImage?.id).toBe(asset.id);
		expect(post?.coverImage?.url).toContain('picsum.photos');
		expect(post?.coverImage?.url).toContain('test/path/image.jpg');
	});
});
