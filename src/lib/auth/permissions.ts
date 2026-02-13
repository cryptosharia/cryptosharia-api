import { type Role, ROLE_PERMISSIONS } from '$lib/auth/rbac';
import ApiResponse from '$lib/api-response';

/**
 * Fetches all unique permission keys for a given role from the static config.
 */
export function getUserPermissions(role: Role | null): string[] {
	if (!role) return [];
	return ROLE_PERMISSIONS[role] || [];
}

/**
 * Checks if the user has the required permission.
 * Uses the permissions attached to the user session (locals.user).
 */
export function hasPermission(locals: App.Locals, requiredPermission: string): boolean {
	if (!locals.user || !locals.user.permissions) return false;

	return locals.user.permissions.includes(requiredPermission);
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
