import type { userRoleEnum } from '$lib/db/tables';

/**
 * Valid system roles derived from the database enum.
 */
export type Role = (typeof userRoleEnum.enumValues)[number];

/**
 * All valid permission keys in the system.
 */
export const ALL_PERMISSIONS = [
	'posts.manage',
	'posts.read',
	'tokens.manage',
	'users.read',
	'users.manage_status',
	'users.manage_roles',
	'messages.read'
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Role -> Permissions Mapping
 * Static configuration for RBAC.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
	super_admin: [...ALL_PERMISSIONS],
	admin: [
		'posts.manage',
		'tokens.manage',
		'users.read',
		'users.manage_status',
		'messages.read'
	],
	posts_manager: ['posts.manage'],
	tokens_manager: ['tokens.manage'],
	member: []
};