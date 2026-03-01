import { describe, expect, it } from 'vitest';

import { createApiTestClient, createAuthenticatedClient, createTestUser } from '$lib/test-utils';

const unauthenticatedClient = createApiTestClient();

describe('Users API Integration - Detail', () => {
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

		const { response } = await unauthenticatedClient.GET('/users/{id}', {
			params: { path: { id: user.id } }
		});

		expect(response.status).toBe(401);
	});
});
