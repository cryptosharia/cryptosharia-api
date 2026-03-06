import { describe, expect, it, beforeEach } from 'vitest';

import { db } from '$lib/db';
import { tags as tagsTable } from '$lib/db/tables';
import { createApiTestClient } from '$lib/test-utils';

const client = createApiTestClient();

describe('Tags API Integration - Detail', () => {
	beforeEach(async () => {
		await db.delete(tagsTable);
	});

	it('should get a single tag by slug', async () => {
		await db.insert(tagsTable).values({ name: 'Test Tag', slug: 'test-tag' });

		const { data, response } = await client.GET('/tags/{id}', {
			params: { path: { id: 'test-tag' } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('test-tag');
		expect(data?.data?.name).toBe('Test Tag');
	});

	it('should get a single tag by UUID', async () => {
		const [tag] = await db
			.insert(tagsTable)
			.values({ name: 'UUID Tag', slug: 'uuid-tag' })
			.returning();

		const { data, response } = await client.GET('/tags/{id}', {
			params: { path: { id: tag.id } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.slug).toBe('uuid-tag');
	});

	it('should return 404 for non-existent tag', async () => {
		const { response } = await client.GET('/tags/{id}', {
			params: { path: { id: 'non-existent' } }
		});

		expect(response.status).toBe(404);
	});
});
