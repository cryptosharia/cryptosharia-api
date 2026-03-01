import { describe, expect, it } from 'vitest';

// IMPORTANT:
// This suite is intentionally negative-path only.
// Do NOT add a "happy path" upload test that reaches the upstream ImgBB provider,
// because it will simply just scatter random files to the ImgBB production albums.
// If you need to test the success path, add a provider abstraction and mock it
// (or run a local stub server) instead of calling the real ImgBB API.

import { createApiTestClient, createAuthenticatedClient } from '$lib/test-utils';

describe('ImgBB Upload API Integration', () => {
	it('should return 401 when request has no authenticated user', async () => {
		const client = createApiTestClient();
		const { response, error } = await client.POST('/imgbb');

		expect(response.status).toBe(401);
		expect(error).toMatchObject({ success: false });
	});

	it('should return 403 for authenticated member without upload permissions', async () => {
		const { client } = await createAuthenticatedClient('member');
		const { response, error } = await client.POST('/imgbb');

		expect(response.status).toBe(403);
		expect(error).toMatchObject({ success: false });
	});

	it('should return 400 when image is missing from multipart body', async () => {
		const { client } = await createAuthenticatedClient('admin');
		const emptyForm = new FormData();
		const { response, error } = await client.POST('/imgbb', { body: emptyForm });

		expect(response.status).toBe(400);
		expect(error).toMatchObject({ success: false });
		expect(
			(error as { errors?: Record<string, string[]> } | undefined)?.errors?.file
		).toBeDefined();
	});

	it('should return 400 for non-image mime type', async () => {
		const { client } = await createAuthenticatedClient('admin');
		const form = new FormData();
		form.set('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
		const { response, error } = await client.POST('/imgbb', { body: form });

		expect(response.status).toBe(400);
		expect(error).toMatchObject({ success: false });
		expect((error as { errors?: Record<string, string[]> } | undefined)?.errors?.file).toEqual(
			expect.arrayContaining([expect.stringContaining('Only image files are allowed')])
		);
	});

	it('should return 400 when uploaded image exceeds 32MB', async () => {
		const { client } = await createAuthenticatedClient('admin');
		const form = new FormData();
		const oversizedImage = new File([new Uint8Array(32 * 1024 * 1024 + 1)], 'huge.png', {
			type: 'image/png'
		});
		form.set('file', oversizedImage);
		const { response, error } = await client.POST('/imgbb', { body: form });

		expect(response.status).toBe(400);
		expect(error).toMatchObject({ success: false });
		expect((error as { errors?: Record<string, string[]> } | undefined)?.errors?.file).toEqual(
			expect.arrayContaining([expect.stringContaining('32MB or less')])
		);
	});
});
