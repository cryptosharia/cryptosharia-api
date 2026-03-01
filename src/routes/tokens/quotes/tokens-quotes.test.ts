import { describe, expect, it } from 'vitest';

// IMPORTANT:
// This suite is intentionally negative-path only.
// Do NOT add a "happy path" test that triggers the upstream CoinMarketCap call,
// because it can drain external quota and create flaky tests.
// Success-path coverage should be done by mocking the market-data provider.

import { createApiTestClient } from '$lib/test-utils';

describe('Tokens Quotes API Integration', () => {
	const unauthorizedClient = createApiTestClient({ useApiKey: false });

	it('should return 401 when API key is missing', async () => {
		const { response } = await unauthorizedClient.GET('/tokens/quotes', {
			params: { query: { slugs: ['bitcoin'] } }
		});

		expect(response.status).toBe(401);
	});
});
