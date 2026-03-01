import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestPost } from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Posts API Integration - Detail', () => {
	it('should get a single post by slug', async () => {
		await createTestPost({ title: 'Single Post Test', slug: 'single-post-test' });

		const { data, response } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: 'single-post-test' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('single-post-test');
		expect(data?.data?.title).toBe('Single Post Test');
	});

	it('should return 404 for non-existent post slug', async () => {
		const { response } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: 'non-existent-slug' } }
		});

		expect(response.status).toBe(404);
	});

	it('should exclude content in list response and include content in detail response', async () => {
		await createTestPost({
			title: 'Content Test',
			slug: 'content-test-post',
			content: 'This secret content should not be in the list!'
		});

		const { data: listData, response: listResponse } = await guestClient.GET('/posts');
		expect(listResponse.status).toBe(200);

		const item = listData?.data?.items.find((candidate) => candidate.slug === 'content-test-post');
		expect(item).toBeDefined();
		expect(item).not.toHaveProperty('content');

		const { data: singleData, response: singleResponse } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: 'content-test-post' } }
		});
		expect(singleResponse.status).toBe(200);
		expect(singleData?.data?.content).toBe('This secret content should not be in the list!');
	});

	it('should not allow finding a draft post by slug for guests', async () => {
		await createTestPost({ slug: 'draft-slug-test', status: 'draft' });

		const { response } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: 'draft-slug-test' } }
		});

		expect(response.status).toBe(404);
	});

	it('should allow admin to find any post by UUID, including drafts', async () => {
		const post = await createTestPost({ slug: 'admin-uuid-draft', status: 'draft' });
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data, response } = await adminClient.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('admin-uuid-draft');
		expect(data?.data?.status).toBe('draft');
	});

	it.each(['guest', 'member'] as const)(
		'should return 404 when %s fetches draft post by UUID',
		async (actor) => {
			const post = await createTestPost({ slug: `${actor}-uuid-draft`, status: 'draft' });
			const requestClient =
				actor === 'member' ? (await createAuthenticatedClient('member')).client : guestClient;

			const { response } = await requestClient.GET('/posts/{id}', {
				params: { path: { id: post.id } }
			});

			expect(response.status).toBe(404);
		}
	);

	it('should allow guest to fetch published post by UUID', async () => {
		const post = await createTestPost({ slug: 'guest-uuid-published', status: 'published' });

		const { data, response } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('guest-uuid-published');
	});

	it('should allow admins to preview draft post via slug', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const post = await createTestPost({ status: 'draft' });

		const { data, response } = await adminClient.GET('/posts/{id}', {
			params: { path: { id: post.slug } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.id).toBe(post.id);
		expect(data?.data?.status).toBe('draft');
	});
});
