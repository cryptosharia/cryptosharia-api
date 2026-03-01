import { describe, expect, it } from 'vitest';

import { attachTagToPost } from '$lib/test-scenarios/tag-relations';
import { createApiTestClient, createTestAsset, createTestPost } from '$lib/test-utils';

const client = createApiTestClient();

describe('Posts API Integration - Metadata and Relations', () => {
	it('should include audit metadata as objects in list response', async () => {
		await createTestPost({ title: 'Metadata Object Test', slug: 'metadata-obj-test' });

		const { data, response } = await client.GET('/posts');
		expect(response.status).toBe(200);

		const item = data?.data?.items?.find((candidate) => candidate.slug === 'metadata-obj-test');
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
		const asset = await createTestAsset({
			pathname: 'test/path/image.jpg',
			filename: 'image.jpg',
			size: 1024,
			mimeType: 'image/jpeg',
			provider: 'picsum',
			width: 800,
			height: 600
		});

		await createTestPost({
			title: 'Post with Image',
			slug: 'post-with-image',
			coverImageId: asset.id
		});

		const { data, response } = await client.GET('/posts/{id}', {
			params: { path: { id: 'post-with-image' } }
		});
		expect(response.status).toBe(200);

		const post = data?.data;
		expect(post?.coverImage).toBeDefined();
		expect(post?.coverImage?.id).toBe(asset.id);
		expect(post?.coverImage?.url).toContain('picsum.photos');
		expect(post?.coverImage?.url).toContain('test/path/image.jpg');
	});

	it('should include tag description in detail response', async () => {
		const post = await createTestPost({ slug: 'post-with-tag-description' });
		await attachTagToPost(post.id, 'halal', 'Tag for halal-related educational content');

		const { data, response } = await client.GET('/posts/{id}', {
			params: { path: { id: 'post-with-tag-description' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					slug: 'halal',
					description: 'Tag for halal-related educational content'
				})
			])
		);
	});
});
