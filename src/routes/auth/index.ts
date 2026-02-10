import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import { RoleMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

// --- Auth: Sign In ---

export const AuthSigninPostBody = z
	.object({
		email: z.string().email(),
		password: z.string().min(8)
	})
	.openapi('AuthSigninPostBody', {
		description: 'Credentials for signing in'
	});

export const AuthSigninPostResponse = User.omit({
	hashedPassword: true,
	passwordHashingAlgorithm: true,
	roleId: true
})
	.extend({
		role: z.string().nullable().describe('The enum value of the assigned role'),
		accessToken: z.string(),
		refreshToken: z.string()
	})
	.openapi('AuthSigninPostResponse', {
		description: 'Successful signin response with tokens and user info'
	});

export type AuthSigninPostResponse = z.infer<typeof AuthSigninPostResponse>;

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

// --- Auth: Refresh Token ---

export const AuthRefreshPostBody = z
	.object({
		refreshToken: z.string().describe('The opaque refresh token')
	})
	.openapi('AuthRefreshPostBody');

export const AuthRefreshPostResponse = z
	.object({
		user: User.omit({ hashedPassword: true, passwordHashingAlgorithm: true }),
		accessToken: z.string(),
		refreshToken: z.string()
	})
	.openapi('AuthRefreshPostResponse', {
		description: 'Successful token refresh'
	});

export type AuthRefreshPostResponse = z.infer<typeof AuthRefreshPostResponse>;

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

// --- Auth: Sign Out ---

export const AuthSignoutPostBody = z
	.object({
		refreshToken: z.string().describe('The refresh token to revoke')
	})
	.openapi('AuthSignoutPostBody');

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

// --- Auth: Get Current User (Me) ---

export const AuthMeGetResponse = User.omit({
	hashedPassword: true,
	passwordHashingAlgorithm: true,
	roleId: true
})
	.extend({
		role: RoleMetadata.nullable().describe('The metadata of the assigned role'),
		permissions: z.array(z.string()).describe('List of programmatic permission keys')
	})
	.openapi('AuthMeGetResponse', {
		description: 'Successful retrieval of current user info'
	});

export type AuthMeGetResponse = z.infer<typeof AuthMeGetResponse>;

export const authMeGet: RouteConfig = {
	path: '/auth/me',
	method: 'get',
	summary: 'Get Current User',
	description: 'Retrieve profile information for the currently authenticated user.',
	responses: {
		...OpenApiResponse.ok(AuthMeGetResponse),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};
