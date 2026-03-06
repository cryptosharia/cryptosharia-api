import { describe, expect, it, beforeEach } from 'vitest';

import { db } from '$lib/db';
import { tags as tagsTable, posts, tokens, postTags, tokenTags } from '$lib/db/tables';
import { createApiTestClient, createAuthenticatedClient, createTestAsset } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tags API Integration - Write', () => {
	beforeEach(async () => {
		await db.delete(tagsTable);
	});

	describe('POST /tags', () => {
		it('should create a tag with valid data', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { data, response } = await adminClient.POST('/tags', {
				body: { name: 'New Tag', slug: 'new-tag', description: 'A new tag' }
			});

			expect(response.status).toBe(201);
			expect(data?.data?.name).toBe('New Tag');
			expect(data?.data?.slug).toBe('new-tag');
		});

		it('should return 403 without auth', async () => {
			const { response } = await client.POST('/tags', {
				body: { name: 'Test', slug: 'test' }
			});

			expect(response.status).toBe(401);
		});

		it('should return 403 for member without tags.manage', async () => {
			const { client: memberClient } = await createAuthenticatedClient('member');

			const { response } = await memberClient.POST('/tags', {
				body: { name: 'Test', slug: 'test' }
			});

			expect(response.status).toBe(403);
		});

		it('should return 409 for duplicate name', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await db.insert(tagsTable).values({ name: 'Duplicate', slug: 'duplicate' });

			const { response } = await adminClient.POST('/tags', {
				body: { name: 'Duplicate', slug: 'different' }
			});

			expect(response.status).toBe(409);
		});

		it('should return 409 for duplicate slug', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await db.insert(tagsTable).values({ name: 'Original', slug: 'original' });

			const { response } = await adminClient.POST('/tags', {
				body: { name: 'Different', slug: 'original' }
			});

			expect(response.status).toBe(409);
		});

		it('should return 400 for missing name', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response } = await adminClient.POST('/tags', {
				body: { name: '', slug: 'test' }
			});

			expect(response.status).toBe(400);
		});
	});

	describe('PATCH /tags/{id}', () => {
		it('should update a tag', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await db.insert(tagsTable).values({ name: 'Old Name', slug: 'old-name' });

			const { data, response } = await adminClient.PATCH('/tags/{id}', {
				params: { path: { id: 'old-name' } },
				body: { name: 'New Name' }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.name).toBe('New Name');
		});

		it('should return 404 for non-existent tag', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response } = await adminClient.PATCH('/tags/{id}', {
				params: { path: { id: 'non-existent' } },
				body: { name: 'Test' }
			});

			expect(response.status).toBe(404);
		});

		it('should return 409 for duplicate slug on update', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await db.insert(tagsTable).values([
				{ name: 'Tag One', slug: 'tag-one' },
				{ name: 'Tag Two', slug: 'tag-two' }
			]);

			const { response } = await adminClient.PATCH('/tags/{id}', {
				params: { path: { id: 'tag-one' } },
				body: { slug: 'tag-two' }
			});

			expect(response.status).toBe(409);
		});
	});

	describe('DELETE /tags/{id}', () => {
		it('should delete an unused tag', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await db.insert(tagsTable).values({ name: 'To Delete', slug: 'to-delete' });

			const { response } = await adminClient.DELETE('/tags/{id}', {
				params: { path: { id: 'to-delete' }, query: { force: false } }
			});

			expect(response.status).toBe(200);
		});

		it('should return 404 for non-existent tag', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response } = await adminClient.DELETE('/tags/{id}', {
				params: { path: { id: 'non-existent' }, query: { force: false } }
			});

			expect(response.status).toBe(404);
		});

		it('should return 409 when tag is in use by posts', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const asset = await createTestAsset();

			const [tag] = await db
				.insert(tagsTable)
				.values({ name: 'In Use', slug: 'in-use' })
				.returning();

			const [post] = await db
				.insert(posts)
				.values({
					title: 'Test Post',
					slug: 'test-post',
					excerpt: 'Test',
					content: 'Test content',
					section: 'news',
					type: 'article',
					status: 'published',
					coverImageId: asset.id
				})
				.returning();

			await db.insert(postTags).values({ postId: post.id, tagId: tag.id });

			const { response, data } = await adminClient.DELETE('/tags/{id}', {
				params: { path: { id: tag.id }, query: { force: false } }
			});

			expect(response.status).toBe(409);
		});

		it('should return 409 when tag is in use by tokens', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const asset = await createTestAsset();

			const [tag] = await db
				.insert(tagsTable)
				.values({ name: 'Token Tag', slug: 'token-tag' })
				.returning();

			const [token] = await db
				.insert(tokens)
				.values({
					name: 'Test Token',
					slug: 'test-token',
					ticker: 'TEST',
					rank: 1,
					excerpt: 'Test token',
					website: 'https://example.com',
					content: 'Test content',
					shariaStatus: 'halal',
					status: 'published',
					logoId: asset.id
				})
				.returning();

			await db.insert(tokenTags).values({ tokenId: token.id, tagId: tag.id });

			const { response, data } = await adminClient.DELETE('/tags/{id}', {
				params: { path: { id: tag.id }, query: { force: false } }
			});

			expect(response.status).toBe(409);
		});

		it('should return 403 without tags.manage permission', async () => {
			const { client: memberClient } = await createAuthenticatedClient('member');
			await db.insert(tagsTable).values({ name: 'Test', slug: 'test-delete' });

			const { response } = await memberClient.DELETE('/tags/{id}', {
				params: { path: { id: 'test-delete' }, query: { force: false } }
			});

			expect(response.status).toBe(403);
		});
	});
});
