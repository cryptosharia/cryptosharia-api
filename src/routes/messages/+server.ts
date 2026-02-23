import type { RequestHandler } from './$types';
import { sendEmail } from '$lib/services/email';
import { Message } from '$lib/db/types';
import { ApiResponse, type PaginatedData } from '$lib/api';
import { parseJsonBody, parseQueryParams } from '$lib/api/request';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { MessagesGetQuery, MessagesGetItem, MessagesPostBody, MessagesPostQuery } from './index';
import { and, ilike, inArray, or, count } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';
import { waitUntil } from '@vercel/functions';
import { requirePermission } from '$lib/auth/permissions';
import { escapeHtml } from '$lib/utils';

/**
 * GET /messages
 * Fetches messages with optional filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const authError = requirePermission(locals, 'messages.read');
	if (authError) return authError;

	const parsedQuery = parseQueryParams(url, MessagesGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const { search, senders, limit, page } = parsedQuery.data;
	const offset = (page - 1) * limit;

	try {
		const filters = [];

		if (senders && senders.length > 0) {
			filters.push(inArray(messages.email, senders as string[]));
		}

		if (search) {
			const query = `%${escapeLikePattern(search)}%`;
			filters.push(
				or(
					ilike(messages.name, query),
					ilike(messages.email, query),
					ilike(messages.message, query)
				)
			);
		}

		const where = filters.length > 0 ? and(...filters) : undefined;

		const [messagesList, [countResult]] = await Promise.all([
			db.query.messages.findMany({
				where,
				limit,
				offset,
				orderBy: (t, { desc }) => [desc(t.createdAt)]
			}),
			db.select({ value: count() }).from(messages).where(where)
		]);

		const total = Number(countResult.value);

		return ApiResponse.ok<PaginatedData<MessagesGetItem>>(
			{
				items: messagesList.map((m) => MessagesGetItem.parse({ ...m })),
				pagination: {
					total,
					limit,
					page,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Messages retrieved successfully'
		);
	} catch (error) {
		console.error('Get messages error:', error);
		return ApiResponse.internalServerError('Failed to retrieve messages');
	}
};

/**
 * POST /messages
 * Creates a new message (contact form submission).
 */
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const parsedQuery = parseQueryParams(url, MessagesPostQuery);
		const parsedBody = await parseJsonBody(request, MessagesPostBody);
		if (!parsedBody.ok) {
			return parsedBody.response;
		}

		const insertData = parsedBody.data;
		const [insertedMessage] = await db.insert(messages).values(insertData).returning();

		const notify = parsedQuery.ok ? parsedQuery.data.notify : true;

		if (notify) {
			const safeName = escapeHtml(insertData.name);
			const safeEmail = escapeHtml(insertData.email);
			const safeMessage = escapeHtml(insertData.message).replace(/\n/g, '<br>');

			waitUntil(
				sendEmail({
					to: 'cryptoshariaforum@gmail.com',
					subject: `New Contact Message from ${safeName}`,
					html: `
						<p><strong>Name:</strong> ${safeName}</p>
						<p><strong>Email:</strong> <i>${safeEmail}</i></p>
						<p><strong>Message:</strong></p>
						<p>${safeMessage}</p>
					`
				})
			);
		}

		return ApiResponse.created(Message.parse({ ...insertedMessage }), 'Message sent successfully');
	} catch (err) {
		console.error('Error creating message:', err);
		return ApiResponse.internalServerError();
	}
};
