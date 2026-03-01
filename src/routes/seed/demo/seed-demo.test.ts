import { describe, expect, it } from 'vitest';

import { createApiTestClient } from '$lib/test-utils';
import { db } from '$lib/db';

describe('Seed Demo API Integration', () => {
	const client = createApiTestClient();

	it('should seed demo data in non-production environment', async () => {
		const { response, data } = await client.POST('/seed/demo');

		expect(response.status).toBe(201);
		expect(data?.success).toBe(true);

		const [users, posts, tokens, messages] = await Promise.all([
			db.query.users.findMany(),
			db.query.posts.findMany(),
			db.query.tokens.findMany(),
			db.query.messages.findMany()
		]);

		expect(users.length).toBeGreaterThan(0);
		expect(posts.length).toBeGreaterThan(0);
		expect(tokens.length).toBeGreaterThan(0);
		expect(messages.length).toBeGreaterThan(0);
	});
});
