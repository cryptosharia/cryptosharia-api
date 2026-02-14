import { ImgbbImage } from '$lib/db/types';
import { OpenApiResponse } from '$lib/api';
import z from '$lib/zod-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const imgbbPost: RouteConfig = {
	path: '/imgbb',
	method: 'post',
	summary: 'Upload Image to ImgBB',
	description: 'Proxies an image upload to the ImgBB service and gets the resulting URLs.',
	request: {
		body: {
			content: {
				'multipart/form-data': {
					schema: z.object({
						image: z.any().openapi({
							type: 'string',
							format: 'binary',
							description: 'The image file to upload'
						})
					})
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(ImgbbImage, 'Image uploaded to ImgBB successfully'),
		...OpenApiResponse.badRequest('No image file provided in the request'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.badGateway('Failed to proxy upload to ImgBB service'),
		...OpenApiResponse.internalServerError(
			'Failed to process image upload due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};
