import z from '$lib/zod-openapi';
import OpenApiResponse from '$lib/openapi-response';
import { User } from '$lib/db/types';
import { userRoleEnum } from '$lib/db/tables';
import { UserMetadata, PaginatedData, AssetMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

// --- User: List ---

export const UserStatus = User.shape.status;
export type UserStatus = z.infer<typeof UserStatus>;

export const UsersGetQuery = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		search: z.string().optional().describe('Search by name or email'),
		role: z.enum(userRoleEnum.enumValues).optional().describe('Filter by role name'),
		status: UserStatus.optional().describe('Filter by account status')
	})
	.openapi('UsersGetQuery');

export const UsersGetItem = UserMetadata.extend({
	avatar: AssetMetadata.nullable(),
	role: z.enum(userRoleEnum.enumValues),
	status: UserStatus,
	isEmailVerified: z.boolean(),
	lastLoginAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date().nullable()
}).openapi('UsersGetItem');
export type UsersGetItem = z.infer<typeof UsersGetItem>;

export const UsersGetResponse = PaginatedData(UsersGetItem, 'Users').openapi('UsersGetResponse');
export type UsersGetResponse = z.infer<typeof UsersGetResponse>;

export const usersGet: RouteConfig = {
	path: '/users',
	method: 'get',
	summary: 'List Users',
	description: 'Retrieve a paginated list of all users. Requires permission: `users.read`.',
	request: {
		query: UsersGetQuery
	},
	responses: {
		...OpenApiResponse.ok(UsersGetResponse, 'Paginated list of users retrieved successfully'),
		...OpenApiResponse.unauthorized('Authentication required'),
		...OpenApiResponse.forbidden('Insufficient permissions to list users'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve users due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};

// --- User: Get Detail ---

export const UsersIdParams = z
	.object({
		id: z.uuid()
	})
	.openapi('UsersIdParams');
export type UsersIdParams = z.infer<typeof UsersIdParams>;

export const UsersIdGetResponse = UsersGetItem.openapi('UsersIdGetResponse');
export type UsersIdGetResponse = z.infer<typeof UsersIdGetResponse>;

export const usersIdGet: RouteConfig = {
	path: '/users/{id}',
	method: 'get',
	summary: 'Get User Detail',
	description:
		'Retrieve detailed information for a specific user. Requires permission: `users.read` or ownership.',
	request: {
		params: UsersIdParams
	},
	responses: {
		...OpenApiResponse.ok(UsersIdGetResponse, 'User details retrieved successfully'),
		...OpenApiResponse.unauthorized('Authentication required'),
		...OpenApiResponse.notFound('User not found'),
		...OpenApiResponse.forbidden('Insufficient permissions to view this user'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve user details due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};

// --- User: Update ---

export const UsersIdPatchBody = User.pick({
	name: true,
	avatarId: true
})
	.partial()
	.openapi('UsersIdPatchBody');
export type UsersIdPatchBody = z.infer<typeof UsersIdPatchBody>;

export const usersIdPatch: RouteConfig = {
	path: '/users/{id}',
	method: 'patch',
	summary: 'Update User',
	description: 'Update an existing user profile. Requires permission: `users.update` or ownership.',
	request: {
		params: UsersIdParams,
		body: {
			content: {
				'application/json': {
					schema: UsersIdPatchBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(UsersIdGetResponse, 'User updated successfully'),
		...OpenApiResponse.badRequest('Invalid update data provided'),
		...OpenApiResponse.notFound('User not found'),
		...OpenApiResponse.forbidden('Insufficient permissions to update this user'),
		...OpenApiResponse.internalServerError('Failed to update user due to an internal server error')
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};

// --- User: Status ---

export const UsersIdStatusPutBody = z
	.object({
		status: UserStatus
	})
	.openapi('UsersIdStatusPutBody');
export type UsersIdStatusPutBody = z.infer<typeof UsersIdStatusPutBody>;

export const usersIdStatusPut: RouteConfig = {
	path: '/users/{id}/status',
	method: 'put',
	summary: 'Update User Status',
	description:
		'Update the administrative status of a user (lifecycle management). Requires permission: `users.manage_status`',
	request: {
		params: UsersIdParams,
		body: {
			content: {
				'application/json': {
					schema: UsersIdStatusPutBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(UsersIdGetResponse, 'User status updated successfully'),
		...OpenApiResponse.badRequest('Invalid status provided'),
		...OpenApiResponse.notFound('User not found'),
		...OpenApiResponse.forbidden('Insufficient permissions to manage user status'),
		...OpenApiResponse.internalServerError('Failed to update status')
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};

// --- User: Assign Role ---

export const UsersIdRolePutBody = z
	.object({
		role: z.enum(userRoleEnum.enumValues).describe('The role name (e.g. "admin", "member")')
	})
	.openapi('UsersIdRolePutBody');
export type UsersIdRolePutBody = z.infer<typeof UsersIdRolePutBody>;

export const usersIdRolePut: RouteConfig = {
	path: '/users/{id}/role',
	method: 'put',
	summary: 'Assign Role',
	description: 'Assign or remove a role for a user. Requires permission: `users.manage_role`.',
	request: {
		params: UsersIdParams,
		body: {
			content: {
				'application/json': {
					schema: UsersIdRolePutBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.ok(UsersIdGetResponse, 'Role assigned successfully'),
		...OpenApiResponse.badRequest('Invalid role provided'),
		...OpenApiResponse.notFound('User not found'),
		...OpenApiResponse.forbidden('Insufficient permissions to manage user roles'),
		...OpenApiResponse.internalServerError('Failed to assign role due to an internal server error')
	},
	security: [{ ApiKeyAuth: [], BearerAuth: [] }]
};
