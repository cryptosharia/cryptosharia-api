import { describe, expect, it } from 'vitest';

import { createAuthenticatedClient, createTestUser } from '$lib/test-utils';

describe('Users API Integration - Role and Status Management', () => {
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
