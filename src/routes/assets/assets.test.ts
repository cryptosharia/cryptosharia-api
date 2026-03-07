import { describe, expect, it } from 'vitest';
import { createAuthenticatedClient } from '$lib/test-utils';
import { env } from '$env/dynamic/private';

// IMPORTANT:
// This suite is intentionally negative-path only.
// Do NOT add a "happy path" test that triggers the upstream Vercel Blob call,
// because it can drain external quota and create flaky tests.
// Success-path coverage should be done by mocking the market-data provider.

describe('Assets Upload API Integration', () => {
	it('should return 401 when request has no authenticated user', async () => {
		const form = new FormData();
		form.set('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));

		const response = await fetch(`${env.TEST_URL}/assets`, {
			method: 'POST',
			headers: {
				'Api-Key': env.CS_API_KEY_TEST ?? ''
			},
			body: form
		});

		expect(response.status).toBe(401);
	});

	it('should return 403 for authenticated member without upload permissions', async () => {
		const { accessToken } = await createAuthenticatedClient('member');
		const form = new FormData();
		form.set('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));

		const response = await fetch(`${env.TEST_URL}/assets`, {
			method: 'POST',
			headers: {
				'Api-Key': env.CS_API_KEY_TEST ?? '',
				Authorization: `Bearer ${accessToken}`
			},
			body: form
		});

		expect(response.status).toBe(403);
	});

	it('should return 400 when file is missing from multipart body', async () => {
		const { accessToken } = await createAuthenticatedClient('admin');
		const response = await fetch(`${env.TEST_URL}/assets`, {
			method: 'POST',
			headers: {
				'Api-Key': env.CS_API_KEY_TEST ?? '',
				Authorization: `Bearer ${accessToken}`
			},
			body: new FormData()
		});

		expect(response.status).toBe(400);
		const payload = (await response.json()) as { errors?: Record<string, string[]> };
		expect(payload.errors?.file).toBeDefined();
	});

	it('should return 400 for empty file upload', async () => {
		const { accessToken } = await createAuthenticatedClient('admin');
		const form = new FormData();
		form.set('file', new File([], 'empty.txt', { type: 'text/plain' }));

		const response = await fetch(`${env.TEST_URL}/assets`, {
			method: 'POST',
			headers: {
				'Api-Key': env.CS_API_KEY_TEST ?? '',
				Authorization: `Bearer ${accessToken}`
			},
			body: form
		});

		expect(response.status).toBe(400);
		const payload = (await response.json()) as { errors?: Record<string, string[]> };
		expect(payload.errors?.file).toEqual(expect.arrayContaining(['File must not be empty']));
	});

	it('should return 400 for file larger than 4MB', async () => {
		const { accessToken } = await createAuthenticatedClient('admin');
		const form = new FormData();
		const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'oversized.bin', {
			type: 'application/octet-stream'
		});
		form.set('file', oversized);

		const response = await fetch(`${env.TEST_URL}/assets`, {
			method: 'POST',
			headers: {
				'Api-Key': env.CS_API_KEY_TEST ?? '',
				Authorization: `Bearer ${accessToken}`
			},
			body: form
		});

		expect(response.status).toBe(400);
		const payload = (await response.json()) as { errors?: Record<string, string[]> };
		expect(payload.errors?.file).toEqual(expect.arrayContaining(['File must be 4MB or less']));
	});
});
