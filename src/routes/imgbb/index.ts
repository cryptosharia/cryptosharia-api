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
					// Note: This is intentionally left untyped for OpenAPI type generation.
					// Consumers generate types with `openapi-typescript` CLI, which does not
					// infer `format: binary` into `File`/`FormData` without a transform hook.
					// Leaving this schema as `any` allows the generated request body type
					// to be `unknown`, so `openapi-fetch` callers can pass a real `FormData`.
					//
					// Runtime contract remains: multipart/form-data with field name `image`.
					schema: z.any().openapi({
						description:
							"Multipart form-data payload. Must include a file part named 'file' (max 32MB, image/* MIME types only)."
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
