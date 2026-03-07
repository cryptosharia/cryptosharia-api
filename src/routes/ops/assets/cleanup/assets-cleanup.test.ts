import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BlobNotFoundError, del } from '@vercel/blob';

import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { assets } from '$lib/db/tables';
import { createApiTestClient, createTestAsset, createTestPost } from '$lib/test-utils';

vi.mock('@vercel/blob', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vercel/blob')>();

	return {
		...actual,
		del: vi.fn()
	};
});

const mockedDel = vi.mocked(del);

const guestClient = createApiTestClient({ useApiKey: false });
const privateClient = createApiTestClient({ headers: { 'Api-Key': env.CS_API_KEY_TEST ?? '' } });
const opsClient = createApiTestClient({ headers: { 'Api-Key': env.CS_API_KEY_OPS ?? '' } });

describe('Ops Assets Cleanup Integration', () => {
	beforeEach(() => {
		mockedDel.mockReset();
		mockedDel.mockResolvedValue();
	});

	it('should reject cleanup without Api-Key', async () => {
		const { response } = await guestClient.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: true } }
		});

		expect(response.status).toBe(401);
	});

	it('should reject cleanup with non-ops Api-Key', async () => {
		const { response } = await privateClient.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: true } }
		});

		expect(response.status).toBe(401);
	});

	it('should report orphan candidates on dry run and skip blob deletes', async () => {
		const oldDate = new Date();
		oldDate.setDate(oldDate.getDate() - 8);

		const orphanAsset = await createTestAsset({
			pathname: 'assets/orphan-cleanup-dryrun.jpg',
			provider: 'vercel_blob',
			createdAt: oldDate
		});

		const referencedAsset = await createTestAsset({
			pathname: 'assets/referenced-cleanup-dryrun.jpg',
			provider: 'vercel_blob',
			createdAt: oldDate
		});

		await createTestPost({ coverImageId: referencedAsset.id });

		const { data, response } = await opsClient.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: true, maxAgeDays: 7, limit: 100 } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.dryRun).toBe(true);
		expect(data?.data?.candidates).toBe(1);
		expect(data?.data?.deleted).toBe(0);
		expect(data?.data?.failed).toBe(0);
		expect(mockedDel).not.toHaveBeenCalled();

		const remainingOrphan = await db.query.assets.findFirst({
			where: (t, { eq }) => eq(t.id, orphanAsset.id)
		});
		expect(remainingOrphan).toBeTruthy();
	});

	it('should clean up orphaned assets and treat missing blob as success', async () => {
		const oldDate = new Date();
		oldDate.setDate(oldDate.getDate() - 8);

		const [orphanAsset] = await db
			.insert(assets)
			.values({
				pathname: 'assets/orphan-cleanup-live.jpg',
				filename: 'orphan-cleanup-live.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				provider: 'vercel_blob',
				createdAt: oldDate
			})
			.returning();

		mockedDel.mockImplementationOnce(async () => {
			throw new BlobNotFoundError();
		});

		const { data, response } = await opsClient.POST('/ops/assets/cleanup', {
			params: { query: { dryRun: false, maxAgeDays: 7, limit: 100 } }
		});

		expect(response.status).toBe(200);
		expect(data?.data?.dryRun).toBe(false);
		expect(data?.data?.candidates).toBe(1);
		expect(data?.data?.deleted).toBe(1);
		expect(data?.data?.failed).toBe(0);

		const deletedAsset = await db.query.assets.findFirst({
			where: (t, { eq }) => eq(t.id, orphanAsset.id)
		});
		expect(deletedAsset).toBeUndefined();
	});
});
