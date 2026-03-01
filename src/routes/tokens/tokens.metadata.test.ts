import { describe, expect, it } from 'vitest';

import { attachTagToToken } from '$lib/test-scenarios/tag-relations';
import { createApiTestClient, createTestAsset, createTestToken } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tokens API Integration - Metadata and Relations', () => {
	it('should include audit metadata as objects in list response', async () => {
		await createTestToken({
			name: 'Metadata Object Token',
			ticker: 'MTO',
			slug: 'meta-obj-token',
			rank: 1
		});

		const { data, response } = await client.GET('/tokens');
		expect(response.status).toBe(200);

		const item = data?.data?.items?.find((candidate) => candidate.slug === 'meta-obj-token');
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

	it('should return final form for logo if assigned', async () => {
		const asset = await createTestAsset({
			pathname: 'test/path/logo.png',
			filename: 'logo.png',
			size: 512,
			mimeType: 'image/png',
			provider: 'picsum',
			width: 128,
			height: 128
		});

		await createTestToken({
			name: 'Token with Logo',
			ticker: 'TWL',
			slug: 'token-with-logo',
			rank: 10,
			logoId: asset.id
		});

		const { data, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'token-with-logo' } }
		});
		expect(response.status).toBe(200);

		const token = data?.data;
		expect(token?.logo).toBeDefined();
		expect(token?.logo?.id).toBe(asset.id);
		expect(token?.logo?.url).toContain('picsum.photos');
		expect(token?.logo?.url).toContain('test/path/logo.png');
	});

	it('should include tag description in detail response', async () => {
		const token = await createTestToken({
			name: 'Token with Tag Description',
			ticker: 'TDSC',
			slug: 'token-with-tag-description',
			rank: 31
		});
		await attachTagToToken(token.id, 'platform', 'Tag for platform ecosystem tokens');

		const { data, response } = await client.GET('/tokens/{id}', {
			params: { path: { id: 'token-with-tag-description' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					slug: 'platform',
					description: 'Tag for platform ecosystem tokens'
				})
			])
		);
	});
});
