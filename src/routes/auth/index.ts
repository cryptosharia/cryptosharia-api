import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import { UserMetadata, AssetMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

// --- Auth: Sign In ---

export const AuthSigninPostBody = z
	.object({
		email: z.email(),
		password: z.string().min(12)
	})
	.openapi('AuthSigninPostBody', {
		description: 'Credentials for signing in'
	});

export const AuthSigninPostResponse = z
	.object({
		user: UserMetadata,
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
		...OpenApiResponse.ok(AuthSigninPostResponse, 'Success, tokens and user metadata returned'),
		...OpenApiResponse.badRequest('Invalid email or password'),
		...OpenApiResponse.unauthorized('Invalid credentials'),
		...OpenApiResponse.internalServerError('Failed to process signin')
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
		user: UserMetadata,
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
		...OpenApiResponse.ok(
			AuthRefreshPostResponse,
			'Success, new tokens and user metadata returned'
		),
		...OpenApiResponse.badRequest('Missing or invalid refresh token'),
		...OpenApiResponse.unauthorized('Refresh token is expired or revoked'),
		...OpenApiResponse.internalServerError('Failed to refresh token')
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
		...OpenApiResponse.ok(undefined, 'Refresh token revoked successfully'),
		...OpenApiResponse.badRequest('Missing or invalid refresh token'),
		...OpenApiResponse.internalServerError('Failed to revoke token')
	},
	security: [{ ApiKeyAuth: [] }]
};

// --- Auth: Get Current User (Me) ---

export const AuthMeGetResponse = UserMetadata.extend({
	avatar: AssetMetadata.nullable().optional(),
	role: z.string().nullable().describe('The programmatic name of the assigned role'),
	permissions: z.array(z.string()).describe('List of programmatic permission keys')
}).openapi('AuthMeGetResponse', {
	description: 'Successful retrieval of current user info'
});

export type AuthMeGetResponse = z.infer<typeof AuthMeGetResponse>;

export const authMeGet: RouteConfig = {
	path: '/auth/me',
	method: 'get',
	summary: 'Get Current User',
	description: 'Retrieve profile information for the currently authenticated user.',
	responses: {
		...OpenApiResponse.ok(AuthMeGetResponse, 'Current user profile retrieved successfully'),
		...OpenApiResponse.unauthorized('Not authenticated'),
		...OpenApiResponse.internalServerError('Failed to fetch user profile')
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};
// --- Auth: Signup ---

export const AuthSignupPostBody = User.pick({
	name: true,
	email: true
})
	.extend({
		password: z.string().min(12)
	})
	.openapi('AuthSignupPostBody', {
		description: 'Data for account registration'
	});

export const AuthSignupPostResponse = UserMetadata.openapi('AuthSignupPostResponse', {
	description: 'Successful signup response with user info'
});

export type AuthSignupPostResponse = z.infer<typeof AuthSignupPostResponse>;

export const authSignupPost: RouteConfig = {
	path: '/auth/signup',
	method: 'post',
	summary: 'Sign Up',
	description:
		'Register a new **regular user** (`role: null`) account. Users must verify their email before they can sign in.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: AuthSignupPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(AuthSignupPostResponse, 'User registered successfully'),
		...OpenApiResponse.badRequest('Invalid input data'),
		...OpenApiResponse.conflict('Email already registered'),
		...OpenApiResponse.internalServerError('Failed to register user')
	},
	security: [{ ApiKeyAuth: [] }]
};

// --- Auth: Verify Email ---

export const AuthVerifyPostBody = z
	.object({
		token: z.string().describe('The verification token received via email')
	})
	.openapi('AuthVerifyPostBody');

export const authVerifyPost: RouteConfig = {
	path: '/auth/verify',
	method: 'post',
	summary: 'Verify Email',
	description: 'Verify a user email address using a secret token.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: AuthVerifyPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(undefined, 'Email verified successfully'),
		...OpenApiResponse.badRequest('Invalid or missing token'),
		...OpenApiResponse.notFound('Invalid or expired token'),
		...OpenApiResponse.internalServerError('Failed to verify email')
	},
	security: [{ ApiKeyAuth: [] }]
};
