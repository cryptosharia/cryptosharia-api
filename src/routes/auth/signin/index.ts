import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/**
 * Request body schema for POST /auth/signin.
 */
export const AuthSigninPostBody = z
	.object({
		email: z.email(),
		password: z.string().min(8)
	})
	.openapi('AuthSigninPostBody', {
		description: 'Credentials for signing in'
	});

/**
 * Response schema for POST /auth/signin.
 */
export const AuthSigninPostResponse = z
	.object({
		user: User.omit({ hashedPassword: true, passwordHashingAlgorithm: true }),
		accessToken: z.string(),
		refreshToken: z.string()
	})
	.openapi('AuthSigninPostResponse', {
		description: 'Successful signin response with tokens and user info'
	});

export type AuthSigninPostResponse = z.infer<typeof AuthSigninPostResponse>;

/**
 * OpenAPI spec for POST /auth/signin
 */
export const authSigninPost: RouteConfig = {
	path: '/auth/signin',
	method: 'post',
	summary: 'Sign In',
	description: 'Authenticate with email and password. Returns access and refresh tokens.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: AuthSigninPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(AuthSigninPostResponse),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
