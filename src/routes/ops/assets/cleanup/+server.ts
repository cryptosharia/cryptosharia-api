import { del, BlobNotFoundError } from '@vercel/blob';
import { VERCEL_BLOB_KEY } from '$env/static/private';
import { ApiResponse } from '$lib/api';
import { parseQueryParams } from '$lib/api/request';
import { db } from '$lib/db';
import { assets, posts, tokens, users } from '$lib/db/tables';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { OpsAssetsCleanupData, OpsAssetsCleanupQuery } from './index';

type CleanupFailure = {
	assetId: string;
	pathname: string;
	reason: string;
};

export const POST: RequestHandler = async ({ url }) => {
	const parsedQuery = parseQueryParams(url, OpsAssetsCleanupQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const { dryRun, limit, maxAgeDays } = parsedQuery.data;

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - maxAgeDays);
	const blobToken = VERCEL_BLOB_KEY;

	try {
		const candidates = await db
			.select({
				id: assets.id,
				pathname: assets.pathname
			})
			.from(assets)
			.leftJoin(posts, eq(posts.coverImageId, assets.id))
			.leftJoin(tokens, eq(tokens.logoId, assets.id))
			.leftJoin(users, eq(users.avatarId, assets.id))
			.where(
				and(
					eq(assets.provider, 'vercel_blob'),
					lte(assets.createdAt, cutoff),
					isNull(posts.id),
					isNull(tokens.id),
					isNull(users.id)
				)
			)
			.orderBy(asc(assets.createdAt), asc(assets.id))
			.limit(limit);

		if (dryRun) {
			return ApiResponse.ok<OpsAssetsCleanupData>(
				OpsAssetsCleanupData.parse({
					dryRun,
					limit,
					maxAgeDays,
					candidates: candidates.length,
					deleted: 0,
					failed: 0,
					failures: []
				}),
				'Assets cleanup dry-run completed'
			);
		}

		if (!blobToken) {
			return ApiResponse.internalServerError('Blob storage is not configured');
		}

		let deleted = 0;
		const failures: CleanupFailure[] = [];

		for (const asset of candidates) {
			try {
				try {
					await del(asset.pathname, { token: blobToken });
				} catch (error) {
					if (!(error instanceof BlobNotFoundError)) {
						throw error;
					}
				}

				await db.delete(assets).where(eq(assets.id, asset.id));
				deleted += 1;
			} catch (error) {
				failures.push({
					assetId: asset.id,
					pathname: asset.pathname,
					reason: error instanceof Error ? error.message : 'Unknown cleanup error'
				});
			}
		}

		return ApiResponse.ok<OpsAssetsCleanupData>(
			OpsAssetsCleanupData.parse({
				dryRun,
				limit,
				maxAgeDays,
				candidates: candidates.length,
				deleted,
				failed: failures.length,
				failures
			}),
			'Assets cleanup completed'
		);
	} catch (error) {
		console.error('POST /ops/assets/cleanup error:', error);
		return ApiResponse.internalServerError('Failed to clean up orphan assets');
	}
};
