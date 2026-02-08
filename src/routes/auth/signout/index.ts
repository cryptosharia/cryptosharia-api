import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/**
 * Request body schema for POST /auth/signout.
 */
export const AuthSignoutPostBody = z
	.object({
		refreshToken: z.string().describe('The refresh token to revoke')
	})
	.openapi('AuthSignoutPostBody');

/**
 * OpenAPI spec for POST /auth/signout
 */
export const authSignoutPost: RouteConfig = {
	path: '/auth/signout',
	method: 'post',
	summary: 'Sign Out',
	description: 'Revoke a refresh token to end a session.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: AuthSignoutPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(
			z.object({
				success: z.boolean(),
				message: z.string()
			})
		),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
