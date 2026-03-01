import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestUser } from '$lib/test-utils';

const unauthenticatedClient = createApiTestClient();

describe('Users API Integration - Profile Update', () => {
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

		const { response } = await unauthenticatedClient.PATCH('/users/{id}', {
			params: { path: { id: user.id } },
			body: { name: 'Unauthorized update' }
		});

		expect(response.status).toBe(401);
	});
});
