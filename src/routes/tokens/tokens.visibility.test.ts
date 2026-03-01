import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestToken } from '$lib/test-utils';

const guestClient = createApiTestClient();

describe('Tokens API Integration - Visibility and Permissions', () => {
	it('should enforce status filter permissions by actor type', async () => {
		await createTestToken({
			name: 'Archived Coin',
			ticker: 'ARC',
			slug: 'archived-coin',
			status: 'archived',
			rank: 100
		});

		const { data: guestDefaultData, response: guestDefaultResponse } =
			await guestClient.GET('/tokens');
		expect(guestDefaultResponse.status).toBe(200);
		expect(guestDefaultData?.data?.items?.some((item) => item.slug === 'archived-coin')).toBe(
			false
		);

		const { response: guestArchivedResponse } = await guestClient.GET('/tokens', {
			params: { query: { statuses: ['archived'] } }
		});
		expect(guestArchivedResponse.status).toBe(403);

		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data: adminArchivedData, response: adminArchivedResponse } = await adminClient.GET(
			'/tokens',
			{
				params: { query: { statuses: ['archived'] } }
			}
		);
		expect(adminArchivedResponse.status).toBe(200);
		expect(adminArchivedData?.data?.items?.some((item) => item.slug === 'archived-coin')).toBe(
			true
		);

		const { data: adminAllData, response: adminAllResponse } = await adminClient.GET('/tokens');
		expect(adminAllResponse.status).toBe(200);
		expect(adminAllData?.data?.items?.some((item) => item.slug === 'archived-coin')).toBe(true);

		const { client: memberClient } = await createAuthenticatedClient('member');

		const forbiddenCases = [
			{ requestClient: memberClient, statuses: ['archived'] as const },
			{ requestClient: guestClient, statuses: ['published', 'archived'] as const }
		];

		for (const { requestClient, statuses } of forbiddenCases) {
			const { response } = await requestClient.GET('/tokens', {
				params: { query: { statuses: [...statuses] } }
			});

			expect(response.status).toBe(403);
		}
	});
});
