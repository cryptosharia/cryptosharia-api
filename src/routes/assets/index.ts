import { OpenApiResponse } from '$lib/api';
import { Asset } from '$lib/db/types';
import z from '$lib/zod-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const AssetsPostResponse = Asset.openapi('AssetsPostResponse');
export type AssetsPostResponse = z.infer<typeof AssetsPostResponse>;

export const assetsPost: RouteConfig = {
	path: '/assets',
	method: 'post',
	summary: 'Upload Asset to Vercel Blob',
	description:
		'Uploads a file (max 4MB) to Vercel Blob and stores its metadata in the assets table. Requires `posts.manage` or `tokens.manage` permission.',
	request: {
		body: {
			content: {
				'multipart/form-data': {
					schema: z.any().openapi({
						description:
							"Multipart form-data payload. Must include a file part named 'file' (max 4MB)."
					})
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(AssetsPostResponse, 'Asset uploaded successfully'),
		...OpenApiResponse.badRequest('Invalid request: missing file, empty file, or file exceeds 4MB'),
		...OpenApiResponse.unauthorized('Authentication required'),
		...OpenApiResponse.forbidden('Requires posts.manage or tokens.manage permission'),
		...OpenApiResponse.badGateway('Failed to upload asset to storage provider'),
		...OpenApiResponse.internalServerError(
			'Failed to process asset upload due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};

export const assetsRoutes: RouteConfig[] = [assetsPost];
