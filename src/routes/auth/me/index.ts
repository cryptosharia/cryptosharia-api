import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

/**
 * Response schema for GET /auth/me.
 */
export const AuthMeGetResponse = User.omit({
	hashedPassword: true,
	passwordHashingAlgorithm: true,
	roleId: true
})
	.extend({
		role: z.string().nullable().describe('The slug/name of the assigned role (e.g. "super-admin")'),
		permissions: z.array(z.string()).describe('List of programmatic permission keys')
	})
	.openapi('AuthMeGetResponse', {
		description: 'Successful retrieval of current user info'
	});

/**
 * OpenAPI spec for GET /auth/me
 */
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
	security: [{ ApiKeyAuth: [] }]
};
