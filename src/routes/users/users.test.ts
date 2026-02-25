import { describe, it, expect } from 'vitest';
import { createApiTestClient, createAuthenticatedClient, createTestUser } from '$lib/test-utils';

const client = createApiTestClient();

describe('Users API Integration', () => {
	// -----------------------------------------------------------------------
	// List (GET /users)
	// -----------------------------------------------------------------------

	describe('GET /users', () => {
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
			expect(data?.data?.items.every((u) => u.role === 'admin')).toBe(true);
		});

		it('should filter users by multiple roles', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			await createTestUser({ role: 'admin' });
			await createTestUser({ role: 'member' });

			const { data, response } = await adminClient.GET('/users', {
				params: { query: { roles: ['admin', 'member'] } }
			});

			expect(response.status).toBe(200);
			const roles = data?.data?.items.map((u) => u.role);
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
			const statuses = data?.data?.items.map((u) => u.status);
			expect(statuses).toContain('active');
			expect(statuses).toContain('suspended');
		});

		it('should return 403 for regular user', async () => {
			const { client: memberClient } = await createAuthenticatedClient('member');

			const { response } = await memberClient.GET('/users');

			expect(response.status).toBe(403);
		});

		it('should return 401 for unauthorized request', async () => {
			const { response } = await client.GET('/users');
			expect(response.status).toBe(401);
		});
	});

	// -----------------------------------------------------------------------
	// Detail (GET /users/{id})
	// -----------------------------------------------------------------------

	describe('GET /users/{id}', () => {
		it('should get own user details', async () => {
			const { client: userClient, user } = await createAuthenticatedClient('member');

			const { data, response } = await userClient.GET('/users/{id}', {
				params: { path: { id: user.id } }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.id).toBe(user.id);
			expect(data?.data?.email).toBe(user.email);
		});

		it('should allow admin to get any user details', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const user = await createTestUser();

			const { data, response } = await adminClient.GET('/users/{id}', {
				params: { path: { id: user.id } }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.id).toBe(user.id);
		});

		it('should return 403 for regular user viewing another user', async () => {
			const { client: userClient } = await createAuthenticatedClient('member');
			const otherUser = await createTestUser();

			const { response } = await userClient.GET('/users/{id}', {
				params: { path: { id: otherUser.id } }
			});

			expect(response.status).toBe(403);
		});

		it('should return 404 for non-existent user', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');

			const { response } = await adminClient.GET('/users/{id}', {
				params: { path: { id: '00000000-0000-0000-0000-000000000000' } }
			});

			expect(response.status).toBe(404);
		});

		it('should return 401 for unauthorized request', async () => {
			const user = await createTestUser();

			const { response } = await client.GET('/users/{id}', {
				params: { path: { id: user.id } }
			});

			expect(response.status).toBe(401);
		});
	});

	// -----------------------------------------------------------------------
	// Update (PATCH /users/{id})
	// -----------------------------------------------------------------------

	describe('PATCH /users/{id}', () => {
		it('should update own profile', async () => {
			const { client: userClient, user } = await createAuthenticatedClient('member');
			const newName = 'Updated Name';

			const { data, response } = await userClient.PATCH('/users/{id}', {
				params: { path: { id: user.id } },
				body: { name: newName }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.name).toBe(newName);
		});

		it('should allow admin to update any user profile', async () => {
			const { client: adminClient } = await createAuthenticatedClient('admin');
			const user = await createTestUser();
			const newName = 'Admin Updated Name';

			const { data, response } = await adminClient.PATCH('/users/{id}', {
				params: { path: { id: user.id } },
				body: { name: newName }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.name).toBe(newName);
		});

		it('should return 403 for regular user updating another user', async () => {
			const { client: userClient } = await createAuthenticatedClient('member');
			const otherUser = await createTestUser();

			const { response } = await userClient.PATCH('/users/{id}', {
				params: { path: { id: otherUser.id } },
				body: { name: 'Trying to update' }
			});

			expect(response.status).toBe(403);
		});

		it('should return 401 for unauthorized request', async () => {
			const user = await createTestUser();

			const { response } = await client.PATCH('/users/{id}', {
				params: { path: { id: user.id } },
				body: { name: 'Unauthorized update' }
			});

			expect(response.status).toBe(401);
		});
	});

	// -----------------------------------------------------------------------
	// Status (PUT /users/{id}/status)
	// -----------------------------------------------------------------------

	describe('PUT /users/{id}/status', () => {
		it('should update user status as super_admin', async () => {
			const { client: superAdminClient } = await createAuthenticatedClient('super_admin');
			const user = await createTestUser();

			const { data, response } = await superAdminClient.PUT('/users/{id}/status', {
				params: { path: { id: user.id } },
				body: { status: 'suspended' }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.status).toBe('suspended');
		});

		it.each(['admin', 'member'] as const)('should return 403 for %s role', async (role) => {
			const { client: roleClient } = await createAuthenticatedClient(role);
			const user = await createTestUser();

			const { response } = await roleClient.PUT('/users/{id}/status', {
				params: { path: { id: user.id } },
				body: { status: 'suspended' }
			});

			expect(response.status).toBe(403);
		});
	});

	// -----------------------------------------------------------------------
	// Role (PUT /users/{id}/role)
	// -----------------------------------------------------------------------

	describe('PUT /users/{id}/role', () => {
		it('should update user role as super_admin', async () => {
			const { client: superAdminClient } = await createAuthenticatedClient('super_admin');
			const user = await createTestUser();

			const { data, response } = await superAdminClient.PUT('/users/{id}/role', {
				params: { path: { id: user.id } },
				body: { role: 'admin' }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.role).toBe('admin');
		});

		it.each(['admin', 'member'] as const)('should return 403 for %s role', async (role) => {
			const { client: roleClient } = await createAuthenticatedClient(role);
			const user = await createTestUser();

			const { response } = await roleClient.PUT('/users/{id}/role', {
				params: { path: { id: user.id } },
				body: { role: 'admin' }
			});

			expect(response.status).toBe(403);
		});
	});
});
