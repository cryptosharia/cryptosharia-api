import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import * as schema from '$lib/db/tables';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import ApiResponse from '$lib/api-response';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from './data';

/**
 * POST /seed/system
 * Initializes the "Brain" of the application (Roles and Permissions).
 * This is safe to run in production if controlled via separate authentication.
 */
export const POST: RequestHandler = async () => {
	// Security: Only allow in dev/preview for now, or add an API key check for production
	if (!dev && env.VERCEL_ENV !== 'preview') {
		// In production, we might want to allow this only with a specific MASTER_KEY
		// if (request.headers.get('x-master-key') !== env.MASTER_KEY)
		return ApiResponse.forbidden('Seeding is forbidden in production environment');
	}

	try {
		console.log('--- System Seeding Started ---');

		// 1. Clear existing RBAC data
		await db.delete(schema.rolePermissions);
		await db.delete(schema.permissions);
		await db.delete(schema.roles);

		// 2. Seed Permissions
		const seededPermissions: Record<string, string> = {};
		for (const p of PERMISSIONS) {
			const [perm] = await db
				.insert(schema.permissions)
				.values(p)
				.onConflictDoUpdate({
					target: schema.permissions.permission,
					set: { permission: p.permission }
				})
				.returning({ id: schema.permissions.id });
			seededPermissions[p.permission] = perm.id;
		}
		console.log(`Seeded ${PERMISSIONS.length} permissions`);

		// 3. Seed Roles
		const seededRoles: Record<string, string> = {};
		for (const r of ROLES) {
			const [role] = await db
				.insert(schema.roles)
				.values({
					...r
				})
				.onConflictDoUpdate({ target: schema.roles.role, set: { role: r.role } })
				.returning({ id: schema.roles.id });
			seededRoles[r.role] = role.id;
		}
		console.log(`Seeded ${ROLES.length} roles`);

		// 4. Link Roles to Permissions
		for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
			const roleId = seededRoles[roleName];
			if (!roleId) continue;

			for (const key of permKeys) {
				const permissionId = seededPermissions[key];
				if (permissionId) {
					await db
						.insert(schema.rolePermissions)
						.values({ roleId, permissionId })
						.onConflictDoNothing();
				}
			}
		}
		console.log('Linked roles to permissions');

		return ApiResponse.created(undefined, 'System configuration seeded successfully');
	} catch (err) {
		console.error('System Seeding failed:', err);
		return ApiResponse.internalServerError();
	}
};
