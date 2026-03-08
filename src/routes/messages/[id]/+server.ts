import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import { MessagesIdGetParams, MessagesIdGetResponse } from '../index';

export const GET: RequestHandler = async ({ params, locals }) => {
	const authError = requirePermission(locals, 'messages.read');
	if (authError) return authError;

	const parsedParams = MessagesIdGetParams.safeParse({ id: params.id });
	if (!parsedParams.success) {
		return ApiResponse.badRequest({ id: ['Invalid UUID format'] });
	}

	try {
		const { id } = parsedParams.data;

		const messageArr = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
		const message = messageArr[0];

		if (!message) {
			return ApiResponse.notFound('Message not found');
		}

		return ApiResponse.ok<MessagesIdGetResponse>(
			MessagesIdGetResponse.parse(message),
			'Message details retrieved successfully'
		);
	} catch (error) {
		console.error('GET /messages/[id] error:', error);
		return ApiResponse.internalServerError('Failed to retrieve message details');
	}
};
