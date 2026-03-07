import { describe, expect, it } from 'vitest';

import { db } from '$lib/db';
import { tags as tagsTable, tokenTags } from '$lib/db/tables';
import {
	createApiTestClient,
	createAuthenticatedClient,
	createTestAsset,
	createTestToken
} from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Tokens API Integration - Write', () => {
	it('should create token with tags using mixed slug and UUID identifiers', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-create-logo.png' });

		const [tagBySlug] = await db
			.insert(tagsTable)
			.values({ name: 'Token Create Slug Tag', slug: 'token-create-slug-tag' })
			.returning();

		const [tagById] = await db
			.insert(tagsTable)
			.values({ name: 'Token Create Id Tag', slug: 'token-create-id-tag' })
			.returning();

		const { data, response } = await adminClient.POST('/tokens', {
			body: {
				name: 'Token Write Create',
				ticker: 'TWC',
				slug: 'token-write-create',
				rank: 77,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'https://example.com/token-write-create',
				logoId: asset.id,
				tags: [tagBySlug.slug, tagById.id]
			}
		});

		expect(response.status).toBe(201);
		expect(data?.data?.slug).toBe('token-write-create');
		expect(data?.data?.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ slug: 'token-create-slug-tag' }),
				expect.objectContaining({ slug: 'token-create-id-tag' })
			])
		);
	});

	it('should return 401 when unauthenticated user creates token', async () => {
		const asset = await createTestAsset({ pathname: 'test/tokens-write-unauth-logo.png' });

		const { response } = await guestClient.POST('/tokens', {
			body: {
				name: 'Unauthorized Token',
				ticker: 'UAT',
				slug: 'unauthorized-token',
				rank: 80,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'https://example.com/unauthorized-token',
				logoId: asset.id
			}
		});

		expect(response.status).toBe(401);
	});

	it('should return 403 when member creates token', async () => {
		const { client: memberClient } = await createAuthenticatedClient('member');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-member-logo.png' });

		const { response } = await memberClient.POST('/tokens', {
			body: {
				name: 'Forbidden Token',
				ticker: 'FBT',
				slug: 'forbidden-token',
				rank: 81,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'https://example.com/forbidden-token',
				logoId: asset.id
			}
		});

		expect(response.status).toBe(403);
	});

	it('should return 400 when tags include unknown identifier', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-unknown-tag-logo.png' });

		const { response } = await adminClient.POST('/tokens', {
			body: {
				name: 'Unknown Tag Token',
				ticker: 'UTT',
				slug: 'unknown-tag-token',
				rank: 82,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'https://example.com/unknown-tag-token',
				logoId: asset.id,
				tags: ['missing-token-tag-slug']
			}
		});

		expect(response.status).toBe(400);
	});

	it('should return 400 when logoId does not exist', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { response } = await adminClient.POST('/tokens', {
			body: {
				name: 'Missing Logo Token',
				ticker: 'MLT',
				slug: 'missing-logo-token',
				rank: 83,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'https://example.com/missing-logo-token',
				logoId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
			}
		});

		expect(response.status).toBe(400);
	});

	it('should return 400 when website is invalid', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-invalid-website-logo.png' });

		const { response } = await adminClient.POST('/tokens', {
			body: {
				name: 'Invalid Website Token',
				ticker: 'IWT',
				slug: 'invalid-website-token',
				rank: 84,
				shariaStatus: 'halal',
				status: 'draft',
				excerpt: 'Token write excerpt',
				content: 'Token write content',
				website: 'not-a-url',
				logoId: asset.id
			}
		});

		expect(response.status).toBe(400);
	});

	it('should replace tags when patch includes tags field', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-patch-logo.png' });
		const token = await createTestToken({
			slug: 'token-patch-tags',
			ticker: 'TPT',
			status: 'draft',
			logoId: asset.id
		});

		const [oldTag] = await db
			.insert(tagsTable)
			.values({ name: 'Token Patch Old Tag', slug: 'token-patch-old-tag' })
			.returning();
		await db.insert(tokenTags).values({ tokenId: token.id, tagId: oldTag.id });

		const [newTag] = await db
			.insert(tagsTable)
			.values({ name: 'Token Patch New Tag', slug: 'token-patch-new-tag' })
			.returning();

		const { data, response } = await adminClient.PATCH('/tokens/{id}', {
			params: { path: { id: token.id } },
			body: {
				name: 'Token Patched',
				status: 'published',
				tags: [newTag.slug]
			}
		});

		expect(response.status).toBe(200);
		expect(data?.data?.name).toBe('Token Patched');
		expect(data?.data?.status).toBe('published');
		expect(data?.data?.publishedAt).not.toBeNull();
		expect(data?.data?.tags).toEqual([expect.objectContaining({ slug: 'token-patch-new-tag' })]);
	});

	it('should return 409 when patch tries to use duplicate slug', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-dup-slug-logo.png' });

		await createTestToken({
			slug: 'existing-token-slug',
			ticker: 'ETS',
			rank: 1001,
			logoId: asset.id
		});
		const tokenToPatch = await createTestToken({
			slug: 'target-token-slug',
			ticker: 'TTS',
			rank: 1002,
			logoId: asset.id
		});

		const { response } = await adminClient.PATCH('/tokens/{id}', {
			params: { path: { id: tokenToPatch.id } },
			body: { slug: 'existing-token-slug' }
		});

		expect(response.status).toBe(409);
	});

	it('should return 409 when patch tries to use duplicate ticker', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const asset = await createTestAsset({ pathname: 'test/tokens-write-dup-ticker-logo.png' });

		await createTestToken({
			slug: 'existing-token-ticker-slug',
			ticker: 'DUPTK',
			rank: 1003,
			logoId: asset.id
		});
		const tokenToPatch = await createTestToken({
			slug: 'target-token-ticker-slug',
			ticker: 'TGTTK',
			rank: 1004,
			logoId: asset.id
		});

		const { response } = await adminClient.PATCH('/tokens/{id}', {
			params: { path: { id: tokenToPatch.id } },
			body: { ticker: 'DUPTK' }
		});

		expect(response.status).toBe(409);
	});

	it('should return 400 when patch body is empty', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const token = await createTestToken({ slug: 'empty-token-patch', ticker: 'ETP', rank: 1005 });

		const { response } = await adminClient.PATCH('/tokens/{id}', {
			params: { path: { id: token.id } },
			body: {}
		});

		expect(response.status).toBe(400);
	});

	it('should delete a token for admin', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const token = await createTestToken({ slug: 'delete-token-slug', ticker: 'DTS', rank: 1006 });

		const { response } = await adminClient.DELETE('/tokens/{id}', {
			params: { path: { id: token.slug } }
		});

		expect(response.status).toBe(200);

		const { response: detailResponse } = await guestClient.GET('/tokens/{id}', {
			params: { path: { id: token.id } }
		});

		expect(detailResponse.status).toBe(404);
	});
});
