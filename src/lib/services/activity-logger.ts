import { db } from '$lib/db';
import * as schema from '$lib/db/tables';

/**
 * Low-level activity logger.
 */
export async function logActivity(params: {
	userId: string;
	action: string;
	subjectType: string;
	subjectId?: string;
	description?: string;
	ipAddress?: string;
}) {
	try {
		await db.insert(schema.activityLogs).values({
			userId: params.userId,
			action: params.action,
			subjectType: params.subjectType,
			subjectId: params.subjectId,
			description: params.description,
			ipAddress: params.ipAddress
		});
	} catch (err) {
		// We don't want activity logging to crash the main request
		console.error('Failed to log activity:', err);
	}
}

/**
 * Convenient helper for route handlers to log user actions.
 * Automatically extracts userId and IP address from the SvelteKit event.
 */
export async function logUserActivity(
	event: { locals: App.Locals },
	params: {
		action: string;
		subjectType: string;
		subjectId?: string;
		description?: string;
	}
) {
	if (!event.locals.user) return;

	await logActivity({
		userId: event.locals.user.id,
		ipAddress: event.locals.clientIp,
		...params
	});
}
