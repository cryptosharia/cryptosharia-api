import { ImgbbImage } from '$lib/db/types';
import { OpenApiResponse } from '$lib/api';
import z from '$lib/zod-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const imgbbPost: RouteConfig = {
	path: '/imgbb',
	method: 'post',
	summary: 'Upload Image to ImgBB',
	description:
		'Proxies an image upload to the ImgBB service. Only image files (JPEG, PNG, WebP, GIF, HEIC, etc.) are accepted, with a maximum size of 32MB. Requires `posts.manage` or `tokens.manage` permission.',
	request: {
		body: {
			content: {
				'multipart/form-data': {
					schema: z.object({
						image: z.any().openapi({
							type: 'string',
							format: 'binary',
							description: 'The image file to upload (max 32MB, image/* MIME types only)'
						})
					})
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(ImgbbImage, 'Image uploaded to ImgBB successfully'),
		...OpenApiResponse.badRequest(
			'Invalid request: missing image, unsupported file type, or exceeds 32MB limit'
		),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.forbidden('Requires posts.manage or tokens.manage permission'),
		...OpenApiResponse.badGateway('Failed to proxy upload to ImgBB service'),
		...OpenApiResponse.internalServerError(
			'Failed to process image upload due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const imgbbRoutes: RouteConfig[] = [imgbbPost];
