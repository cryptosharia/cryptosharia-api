import { describe, expect, it } from 'vitest';

import { db } from '$lib/db';
import { postTags, tags as tagsTable } from '$lib/db/tables';
import {
	createApiTestClient,
	createAuthenticatedClient,
	createTestAsset,
	createTestPost
} from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Posts API Integration - Write', () => {
	it('should create post with tags using mixed slug and UUID identifiers', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset();

		const [tagBySlug] = await db
			.insert(tagsTable)
			.values({ name: 'Create Slug Tag', slug: 'create-slug-tag' })
			.returning();

		const [tagById] = await db
			.insert(tagsTable)
			.values({ name: 'Create Id Tag', slug: 'create-id-tag' })
			.returning();

		const { data, response } = await adminClient.POST('/posts', {
			body: {
				title: 'Created by write test',
				slug: 'created-by-write-test',
				excerpt: 'Post excerpt',
				content: 'Post content',
				coverImageId: asset.id,
				section: 'education',
				type: 'article',
				status: 'draft',
				isFeatured: false,
				tags: [tagBySlug.slug, tagById.id]
			}
		});

		expect(response.status).toBe(201);
		expect(data?.data?.slug).toBe('created-by-write-test');
		expect(data?.data?.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ slug: 'create-slug-tag' }),
				expect.objectContaining({ slug: 'create-id-tag' })
			])
		);
	});

	it('should return 401 when unauthenticated user creates post', async () => {
		const asset = await createTestAsset();

		const { response } = await guestClient.POST('/posts', {
			body: {
				title: 'Unauthorized Post',
				slug: 'unauthorized-post',
				excerpt: 'Post excerpt',
				content: 'Post content',
				coverImageId: asset.id,
				section: 'education',
				type: 'article',
				status: 'draft',
				isFeatured: false
			}
		});

		expect(response.status).toBe(401);
	});

	it('should return 403 when member creates post', async () => {
		const { client: memberClient } = await createAuthenticatedClient('member');
		const asset = await createTestAsset();

		const { response } = await memberClient.POST('/posts', {
			body: {
				title: 'Forbidden Post',
				slug: 'forbidden-post',
				excerpt: 'Post excerpt',
				content: 'Post content',
				coverImageId: asset.id,
				section: 'education',
				type: 'article',
				status: 'draft',
				isFeatured: false
			}
		});

		expect(response.status).toBe(403);
	});

	it('should return 400 when tags include unknown identifier', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset();

		const { response } = await adminClient.POST('/posts', {
			body: {
				title: 'Unknown tag post',
				slug: 'unknown-tag-post',
				excerpt: 'Post excerpt',
				content: 'Post content',
				coverImageId: asset.id,
				section: 'education',
				type: 'article',
				status: 'draft',
				isFeatured: false,
				tags: ['missing-tag-slug']
			}
		});

		expect(response.status).toBe(400);
	});

	it('should return 400 when externalLink is invalid', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/posts-write-invalid-link.jpg' });

		const { response } = await adminClient.POST('/posts', {
			body: {
				title: 'Invalid link post',
				slug: 'invalid-link-post',
				excerpt: 'Post excerpt',
				content: 'Post content',
				coverImageId: asset.id,
				section: 'education',
				type: 'article',
				status: 'draft',
				isFeatured: false,
				externalLink: 'not-a-url'
			}
		});

		expect(response.status).toBe(400);
	});

	it('should replace tags when patch includes tags field', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const post = await createTestPost({ slug: 'patch-tags-post', status: 'draft' });

		const [oldTag] = await db
			.insert(tagsTable)
			.values({ name: 'Patch Old Tag', slug: 'patch-old-tag' })
			.returning();
		await db.insert(postTags).values({ postId: post.id, tagId: oldTag.id });

		const [newTag] = await db
			.insert(tagsTable)
			.values({ name: 'Patch New Tag', slug: 'patch-new-tag' })
			.returning();

		const { data, response } = await adminClient.PATCH('/posts/{id}', {
			params: { path: { id: post.id } },
			body: {
				title: 'Patched Title',
				status: 'published',
				tags: [newTag.slug]
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.title).toBe('Patched Title');
		expect(data?.data?.status).toBe('published');
		expect(data?.data?.publishedAt).not.toBeNull();
		expect(data?.data?.tags).toEqual([expect.objectContaining({ slug: 'patch-new-tag' })]);
	});

	it('should return 409 when patch tries to use duplicate slug', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const assetOne = await createTestAsset({ pathname: 'test/posts-write-duplicate-1.jpg' });
		const assetTwo = await createTestAsset({ pathname: 'test/posts-write-duplicate-2.jpg' });

		await createTestPost({ slug: 'existing-slug-post', coverImageId: assetOne.id });
		const postToPatch = await createTestPost({
			slug: 'target-slug-post',
			coverImageId: assetTwo.id
		});

		const { response } = await adminClient.PATCH('/posts/{id}', {
			params: { path: { id: postToPatch.id } },
			body: { slug: 'existing-slug-post' }
		});

		expect(response.status).toBe(409);
	});

	it('should return 400 when patch body is empty', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const post = await createTestPost({ slug: 'empty-patch-post' });

		const { response } = await adminClient.PATCH('/posts/{id}', {
			params: { path: { id: post.id } },
			body: {}
		});

		expect(response.status).toBe(400);
	});

	it('should delete a post for admin', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const post = await createTestPost({ slug: 'delete-post-slug' });

		const { response } = await adminClient.DELETE('/posts/{id}', {
			params: { path: { id: post.slug } }
		});

		expect(response.status).toBe(200);

		const { response: detailResponse } = await guestClient.GET('/posts/{id}', {
			params: { path: { id: post.id } }
		});

		expect(detailResponse.status).toBe(404);
	});
});
