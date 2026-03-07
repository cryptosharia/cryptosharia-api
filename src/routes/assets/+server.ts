import { del, put } from '@vercel/blob';
import { imageSize } from 'image-size';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';
import { requirePermission } from '$lib/auth/permissions';
import { ApiResponse } from '$lib/api';
import { db } from '$lib/db';
import { assets, type assetProviderEnum } from '$lib/db/tables';
import { Asset } from '$lib/db/types';
import { logUserActivity } from '$lib/services/activity-logger';
import type { RequestHandler } from './$types';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel Function body-safe limit)
const PROVIDER: (typeof assetProviderEnum.enumValues)[number] = 'vercel_blob';

function toBlobKey(filename: string): string {
	const dotIndex = filename.lastIndexOf('.');
	const hasExt = dotIndex > 0 && dotIndex < filename.length - 1;
	const base = hasExt ? filename.slice(0, dotIndex) : filename;
	const ext = hasExt
		? filename
				.slice(dotIndex + 1)
				.toLowerCase()
				.replace(/[^a-z0-9]/g, '')
		: '';
	const slugBase =
		base
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'file';

	const extension = ext.length > 0 ? `.${ext}` : '';
	const isProduction = !dev && env.VERCEL_ENV === 'production';
	const prefix = isProduction ? 'assets' : 'temp/assets';
	return `${prefix}/${crypto.randomUUID()}-${slugBase}${extension}`;
}

async function extractImageDimensions(
	file: File
): Promise<{ width: number | null; height: number | null }> {
	if (!file.type.startsWith('image/')) {
		return { width: null, height: null };
	}

	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const dimensions = imageSize(bytes);

		return {
			width: dimensions.width ?? null,
			height: dimensions.height ?? null
		};
	} catch (error) {
		console.warn('Unable to extract image dimensions:', error);
		return { width: null, height: null };
	}
}

export const POST: RequestHandler = async (event) => {
	const authError = requirePermission(event.locals, ['posts.manage', 'tokens.manage']);
	if (authError) return authError;

	try {
		const formData = await event.request.formData();
		const file = formData.get('file');

		if (!(file instanceof File)) {
			return ApiResponse.badRequest({
				file: ['File is required']
			});
		}

		if (file.size <= 0) {
			return ApiResponse.badRequest({
				file: ['File must not be empty']
			});
		}

		if (file.size > MAX_FILE_SIZE) {
			return ApiResponse.badRequest({
				file: ['File must be 4MB or less']
			});
		}

		const blobKey = toBlobKey(file.name);
		const storageFilename = blobKey.split('/').at(-1) ?? blobKey;
		const { width, height } = await extractImageDimensions(file);

		let blob: { url: string; pathname?: string };
		try {
			blob = await put(blobKey, file, {
				access: 'public',
				addRandomSuffix: false,
				contentType: file.type || undefined,
				token: BLOB_READ_WRITE_TOKEN
			});
		} catch (error) {
			console.error('Vercel Blob upload error:', error);
			return ApiResponse.badGateway('Failed to upload asset to storage provider');
		}

		let asset: typeof assets.$inferSelect;
		try {
			const storedPathname = blob.pathname ?? new URL(blob.url).pathname.replace(/^\//, '');

			const [insertedAsset] = await db
				.insert(assets)
				.values({
					pathname: storedPathname,
					filename: storageFilename,
					size: file.size,
					mimeType: file.type || null,
					width,
					height,
					provider: PROVIDER,
					createdBy: event.locals.user?.id
				})
				.returning();

			asset = insertedAsset;
		} catch (error) {
			try {
				await del(blob.url, { token: BLOB_READ_WRITE_TOKEN });
			} catch (cleanupError) {
				console.error('Asset upload cleanup error:', cleanupError);
			}

			console.error('Asset metadata persist error:', error);
			return ApiResponse.internalServerError('Failed to persist uploaded asset metadata');
		}

		await logUserActivity(event, {
			action: 'asset.upload',
			subjectType: 'asset',
			subjectId: asset.id,
			description: `Uploaded asset: ${storageFilename}`
		});

		return ApiResponse.created(Asset.parse(asset), 'Asset uploaded successfully');
	} catch (error) {
		console.error('Asset upload error:', error);
		return ApiResponse.internalServerError('Failed to process asset upload');
	}
};
