import { db } from '$lib/db';
import * as schema from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';

/**
 * Fetches all unique permission keys for a given role.
 * Optimized to return a flat array of strings.
 */
export async function getUserPermissions(roleId: string): Promise<string[]> {
	const results = await db
		.select({
			key: schema.permissions.key
		})
		.from(schema.rolePermissions)
		.innerJoin(schema.permissions, eq(schema.rolePermissions.permissionId, schema.permissions.id))
		.where(eq(schema.rolePermissions.roleId, roleId));

	return results.map((r) => r.key);
}

/**
 * Returns true if the user in locals has the specified permission.
 */
export function hasPermission(locals: App.Locals, permission: string): boolean {
	return locals.user?.permissions.includes(permission) ?? false;
}

/**
 * Middleware-style helper: Checks if the current user has a specific permission.
 * Throws a standardized 403 Forbidden response if not authorized.
 */
export function requirePermission(locals: App.Locals, permission: string) {
	if (!locals.user) {
		throw ApiResponse.unauthorized();
	}

	if (!hasPermission(locals, permission)) {
		throw ApiResponse.forbidden(`Missing required permission: ${permission}`);
	}
}

/**
 * Middleware-style helper: Checks if the current user has any of the specified permissions.
 * Useful for endpoints that can be accessed by multiple types of staff.
 */
export function requireAnyPermission(locals: App.Locals, permissions: string[]) {
	if (!locals.user) {
		throw ApiResponse.unauthorized();
	}

	const hasAny = permissions.some((p) => hasPermission(locals, p));
	if (!hasAny) {
		throw ApiResponse.forbidden(`Missing one of required permissions: ${permissions.join(', ')}`);
	}
}
