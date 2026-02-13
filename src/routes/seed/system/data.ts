import type { InferInsertModel } from 'drizzle-orm';
import * as schema from '$lib/db/tables';

export type SeedPermission = InferInsertModel<typeof schema.permissions>;
export type SeedRole = InferInsertModel<typeof schema.roles>;

// Permissions (System)
export const PERMISSIONS: SeedPermission[] = [
	{ permission: 'posts.manage' },
	{ permission: 'tokens.manage' },
	{ permission: 'users.read' },
	{ permission: 'users.manage_status' },
	{ permission: 'users.manage_role' },
	{ permission: 'messages.read' }
];

// Roles (System)
export const ROLES: SeedRole[] = [
	{ role: 'super_admin' },
	{ role: 'admin' },
	{ role: 'posts_manager' },
	{ role: 'tokens_manager' }
];

// Role to Permissions Mapping (System)
export const ROLE_PERMISSIONS: Record<string, string[]> = {
	super_admin: PERMISSIONS.map((p) => p.permission),
	admin: ['posts.manage', 'tokens.manage', 'users.read', 'users.manage_status', 'messages.read'],
	posts_manager: ['posts.manage'],
	tokens_manager: ['tokens.manage']
};
