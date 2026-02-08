import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/**
 * Request body schema for POST /auth/refresh.
 */
export const AuthRefreshPostBody = z
	.object({
		refreshToken: z.string().describe('The opaque refresh token')
	})
	.openapi('AuthRefreshPostBody');

/**
 * Response schema for POST /auth/refresh.
 */
export const AuthRefreshPostResponse = z
	.object({
		user: User.omit({ hashedPassword: true, passwordHashingAlgorithm: true }),
		accessToken: z.string(),
		refreshToken: z.string()
	})
	.openapi('AuthRefreshPostResponse', {
		description: 'Successful token refresh'
	});

/**
 * OpenAPI spec for POST /auth/refresh
 */
export const authRefreshPost: RouteConfig = {
	path: '/auth/refresh',
	method: 'post',
	summary: 'Refresh Token',
	description: 'Rotate refresh token and issue a new access token.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: AuthRefreshPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(AuthRefreshPostResponse),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
