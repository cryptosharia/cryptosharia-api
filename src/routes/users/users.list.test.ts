import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestUser } from '$lib/test-utils';

const unauthenticatedClient = createApiTestClient();

describe('Users API Integration - List', () => {
	it('should list users for admin', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');

		const { data, response } = await adminClient.GET('/users');

		expect(response.status).toBe(200);
		expect(data?.data?.items).toBeDefined();
		expect(data?.data?.items.length).toBeGreaterThanOrEqual(1);
	});

	it('should filter users by search query', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		const uniqueName = `UniqueUser-${Math.random()}`;
		await createTestUser({ name: uniqueName });

		const { data, response } = await adminClient.GET('/users', {
			params: { query: { search: uniqueName } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items).toHaveLength(1);
		expect(data?.data?.items[0].name).toBe(uniqueName);
	});

	it('should filter users by roles', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		await createTestUser({ role: 'admin' });
		await createTestUser({ role: 'member' });

		const { data, response } = await adminClient.GET('/users', {
			params: { query: { roles: ['admin'] } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.items.every((user) => user.role === 'admin')).toBe(true);
	});

	it('should filter users by multiple roles', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		await createTestUser({ role: 'admin' });
		await createTestUser({ role: 'member' });

		const { data, response } = await adminClient.GET('/users', {
			params: { query: { roles: ['admin', 'member'] } }
		});

		expect(response.status).toBe(200);
		const roles = data?.data?.items.map((user) => user.role);
		expect(roles).toContain('admin');
		expect(roles).toContain('member');
	});

	it('should filter users by multiple statuses', async () => {
		const { client: adminClient } = await createAuthenticatedClient('admin');
		await createTestUser({ status: 'active' });
		await createTestUser({ status: 'suspended' });

		const { data, response } = await adminClient.GET('/users', {
			params: { query: { statuses: ['active', 'suspended'] } }
		});

		expect(response.status).toBe(200);
		const statuses = data?.data?.items.map((user) => user.status);
		expect(statuses).toContain('active');
		expect(statuses).toContain('suspended');
	});

	it('should return 403 for regular user', async () => {
		const { client: memberClient } = await createAuthenticatedClient('member');

		const { response } = await memberClient.GET('/users');

		expect(response.status).toBe(403);
	});

	it('should return 401 for unauthorized request', async () => {
		const { response } = await unauthenticatedClient.GET('/users');

		expect(response.status).toBe(401);
	});
});
