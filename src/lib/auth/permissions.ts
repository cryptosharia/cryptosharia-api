import { type Role, ROLE_PERMISSIONS } from '$lib/auth/rbac';
import { ApiResponse } from '$lib/api';

/**
 * Fetches all unique permission keys for a given role from the static config.
 */
export function getUserPermissions(role: Role): string[] {
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
 * Middleware-style helper: Checks if the current user has the required permission(s).
 * - If a string is provided, it checks for that specific permission.
 * - If an array is provided, it checks if the user has AT LEAST ONE of those permissions (OR logic).
 * Returns a standardized 403 Forbidden Response if not authorized, otherwise returns void.
 */
export function requirePermission(
	locals: App.Locals,
	permission: string | string[]
): Response | void {
	if (!locals.user) {
		return ApiResponse.unauthorized();
	}

	const permissions = Array.isArray(permission) ? permission : [permission];
	const hasPerm = permissions.some((p) => hasPermission(locals, p));

	if (!hasPerm) {
		return ApiResponse.forbidden(
			Array.isArray(permission)
				? `Missing one of required permissions: ${permission.join(', ')}`
				: `Missing required permission: ${permission}`
		);
	}
}
