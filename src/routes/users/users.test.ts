import { describe, it, expect } from 'vitest';
import { createApiTestClient, createTestUser, signTestUserIn } from '$lib/test-utils';

const client = createApiTestClient();

describe('Users API Integration', () => {
	describe('GET /users', () => {
		it('should list users for admin', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			const { data, response } = await client.GET('/users', {
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items).toBeDefined();
			expect(data?.data?.items.length).toBeGreaterThanOrEqual(1);
		});

		it('should filter users by search query', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			const uniqueName = `UniqueUser-${Math.random()}`;
			await createTestUser({ name: uniqueName });

			const { data, response } = await client.GET('/users', {
				params: {
					query: { search: uniqueName }
				},
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items).toHaveLength(1);
			expect(data?.data?.items[0].name).toBe(uniqueName);
		});

		it('should filter users by roles', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			await createTestUser({ role: 'admin' });
			await createTestUser({ role: 'member' });

			const { data, response } = await client.GET('/users', {
				params: {
					query: { roles: ['admin'] }
				},
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.items.every((u) => u.role === 'admin')).toBe(true);
		});

		it('should filter users by multiple roles', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			await createTestUser({ role: 'admin' });
			await createTestUser({ role: 'member' });

			const { data, response } = await client.GET('/users', {
				params: {
					query: { roles: ['admin', 'member'] }
				},
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			const roles = data?.data?.items.map((u) => u.role);
			expect(roles).toContain('admin');
			expect(roles).toContain('member');
		});

		it('should filter users by multiple statuses', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			await createTestUser({ status: 'active' });
			await createTestUser({ status: 'suspended' });

			const { data, response } = await client.GET('/users', {
				params: {
					query: { statuses: ['active', 'suspended'] }
				},
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			const statuses = data?.data?.items.map((u) => u.status);
			expect(statuses).toContain('active');
			expect(statuses).toContain('suspended');
		});

		it('should return 403 for regular user', async () => {
			const user = await createTestUser({ role: 'member', isEmailVerified: true });
			const accessToken = await signTestUserIn(user.email);

			const { response } = await client.GET('/users', {
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});

		it('should return 401 for unauthorized request', async () => {
			const { response } = await client.GET('/users');
			expect(response.status).toBe(401);
		});
	});

	describe('GET /users/{id}', () => {
		it('should get own user details', async () => {
			const user = await createTestUser({ isEmailVerified: true });
			const accessToken = await signTestUserIn(user.email);

			const { data, response } = await client.GET('/users/{id}', {
				params: { path: { id: user.id } },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.id).toBe(user.id);
			expect(data?.data?.email).toBe(user.email);
		});

		it('should allow admin to get any user details', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);

			const { data, response } = await client.GET('/users/{id}', {
				params: { path: { id: user.id } },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.id).toBe(user.id);
		});

		it('should return 403 for regular user viewing another user', async () => {
			const user1 = await createTestUser({ isEmailVerified: true });
			const user2 = await createTestUser();
			const accessToken = await signTestUserIn(user1.email);

			const { response } = await client.GET('/users/{id}', {
				params: { path: { id: user2.id } },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});

		it('should return 404 for non-existent user', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const accessToken = await signTestUserIn(admin.email);

			const { response } = await client.GET('/users/{id}', {
				params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(404);
		});
	});

	describe('PATCH /users/{id}', () => {
		it('should update own profile', async () => {
			const user = await createTestUser({ isEmailVerified: true });
			const accessToken = await signTestUserIn(user.email);
			const newName = 'Updated Name';

			const { data, response } = await client.PATCH('/users/{id}', {
				params: { path: { id: user.id } },
				body: { name: newName },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.name).toBe(newName);
		});

		it('should allow admin to update any user profile', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);
			const newName = 'Admin Updated Name';

			const { data, response } = await client.PATCH('/users/{id}', {
				params: { path: { id: user.id } },
				body: { name: newName },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.name).toBe(newName);
		});

		it('should return 403 for regular user updating another user', async () => {
			const user1 = await createTestUser({ isEmailVerified: true });
			const user2 = await createTestUser();
			const accessToken = await signTestUserIn(user1.email);

			const { response } = await client.PATCH('/users/{id}', {
				params: { path: { id: user2.id } },
				body: { name: 'Trying to update' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});
	});

	describe('PUT /users/{id}/status', () => {
		it('should update user status as super_admin', async () => {
			const admin = await createTestUser({ role: 'super_admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);

			const { data, response } = await client.PUT('/users/{id}/status', {
				params: { path: { id: user.id } },
				body: { status: 'suspended' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.status).toBe('suspended');
		});

		it('should return 403 for regular admin (non-super)', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);

			const { response } = await client.PUT('/users/{id}/status', {
				params: { path: { id: user.id } },
				body: { status: 'suspended' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});

		it('should return 403 for regular user', async () => {
			const user1 = await createTestUser({ isEmailVerified: true });
			const user2 = await createTestUser();
			const accessToken = await signTestUserIn(user1.email);

			const { response } = await client.PUT('/users/{id}/status', {
				params: { path: { id: user2.id } },
				body: { status: 'suspended' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});
	});

	describe('PUT /users/{id}/role', () => {
		it('should update user role as super_admin', async () => {
			const admin = await createTestUser({ role: 'super_admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);

			const { data, response } = await client.PUT('/users/{id}/role', {
				params: { path: { id: user.id } },
				body: { role: 'admin' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(200);
			expect(data?.data?.role).toBe('admin');
		});

		it('should return 403 for regular admin (non-super)', async () => {
			const admin = await createTestUser({ role: 'admin', isEmailVerified: true });
			const user = await createTestUser();
			const accessToken = await signTestUserIn(admin.email);

			const { response } = await client.PUT('/users/{id}/role', {
				params: { path: { id: user.id } },
				body: { role: 'admin' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});

		it('should return 403 for regular user', async () => {
			const user1 = await createTestUser({ isEmailVerified: true });
			const user2 = await createTestUser();
			const accessToken = await signTestUserIn(user1.email);

			const { response } = await client.PUT('/users/{id}/role', {
				params: { path: { id: user2.id } },
				body: { role: 'admin' },
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			expect(response.status).toBe(403);
		});
	});
});
