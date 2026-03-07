import { OpenApiResponse } from '$lib/api';
import z from '$lib/zod-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const OpsAssetsCleanupQuery = z
	.object({
		dryRun: z
			.preprocess((val) => {
				if (val === 'true') return true;
				if (val === 'false') return false;
				return val;
			}, z.boolean())
			.optional()
			.default(false),
		limit: z.coerce.number().int().min(1).max(500).optional().default(100),
		maxAgeDays: z.coerce.number().int().min(1).max(365).optional().default(7)
	})
	.openapi('OpsAssetsCleanupQuery');
export type OpsAssetsCleanupQuery = z.infer<typeof OpsAssetsCleanupQuery>;

export const OpsAssetsCleanupFailure = z
	.object({
		assetId: z.uuid(),
		pathname: z.string(),
		reason: z.string()
	})
	.openapi('OpsAssetsCleanupFailure');

export const OpsAssetsCleanupData = z
	.object({
		dryRun: z.boolean(),
		limit: z.number().int(),
		maxAgeDays: z.number().int(),
		candidates: z.number().int(),
		deleted: z.number().int(),
		failed: z.number().int(),
		failures: z.array(OpsAssetsCleanupFailure)
	})
	.openapi('OpsAssetsCleanupData');
export type OpsAssetsCleanupData = z.infer<typeof OpsAssetsCleanupData>;

export const opsAssetsCleanupPost: RouteConfig = {
	path: '/ops/assets/cleanup',
	method: 'post',
	summary: 'Cleanup Orphan Assets',
	description:
		'Remove orphaned Vercel Blob assets not referenced by posts, tokens, or user avatars. Requires Api-Key equal to CS_API_KEY_OPS.',
	request: {
		query: OpsAssetsCleanupQuery
	},
	responses: {
		...OpenApiResponse.ok(OpsAssetsCleanupData, 'Assets cleanup executed successfully'),
		...OpenApiResponse.badRequest('Invalid cleanup query parameters provided'),
		...OpenApiResponse.unauthorized('Invalid or missing Api-Key for ops endpoints'),
		...OpenApiResponse.internalServerError(
			'Failed to clean up orphan assets due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const opsAssetsCleanupRoutes: RouteConfig[] = [opsAssetsCleanupPost];
