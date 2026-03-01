import { describe, expect, it } from 'vitest';

import {
	createApiTestClient,
	createAuthenticatedClient,
	createTestAsset,
	createTestPost
} from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Posts API Integration - Visibility and Permissions', () => {
	it('should enforce status filter permissions by actor type', async () => {
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

		const { data: guestDefaultData, response: guestDefaultResponse } =
			await guestClient.GET('/posts');
		expect(guestDefaultResponse.status).toBe(200);
		expect(guestDefaultData?.data?.items?.some((item) => item.slug === 'draft-post')).toBe(false);

		const { response: guestDraftResponse } = await guestClient.GET('/posts', {
			params: { query: { statuses: ['draft'] } }
		});
		expect(guestDraftResponse.status).toBe(403);

		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data: adminDraftData, response: adminDraftResponse } = await adminClient.GET('/posts', {
			params: { query: { statuses: ['draft'] } }
		});
		expect(adminDraftResponse.status).toBe(200);
		expect(adminDraftData?.data?.items?.some((item) => item.slug === 'draft-post')).toBe(true);

		const { data: adminAllData, response: adminAllResponse } = await adminClient.GET('/posts');
		expect(adminAllResponse.status).toBe(200);
		expect(adminAllData?.data?.items?.some((item) => item.slug === 'published-post')).toBe(true);
		expect(adminAllData?.data?.items?.some((item) => item.slug === 'draft-post')).toBe(true);

		const { client: memberClient } = await createAuthenticatedClient('member');

		const forbiddenCases = [
			{ requestClient: memberClient, statuses: ['draft'] as const },
			{ requestClient: guestClient, statuses: ['published', 'draft'] as const }
		];

		for (const { requestClient, statuses } of forbiddenCases) {
			const { response } = await requestClient.GET('/posts', {
				params: { query: { statuses: [...statuses] } }
			});

			expect(response.status).toBe(403);
		}
	});
});
