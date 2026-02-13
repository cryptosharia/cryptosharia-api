import { GS_SEND_MESSAGE_URL } from '$env/static/private';
import { Message } from '$lib/db/types';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { MessagesGetQuery, MessagesGetItem, MessagesPostBody, MessagesPostQuery } from './index';
import { and, ilike, inArray, or, count } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions';
import { requirePermission } from '$lib/auth/permissions';
import type { PaginatedData } from '$lib/types';

/**
 * GET /messages
 * Fetches messages with optional filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization
	try {
		requirePermission(locals, 'messages.read');
	} catch (apiError) {
		return apiError as Response;
	}

	const params = Object.fromEntries(url.searchParams);
	const result = MessagesGetQuery.safeParse(params);

	if (!result.success) {
		return ApiResponse.badRequest(
			z.flattenError(result.error).fieldErrors as Record<string, string[]>
		);
	}

	const { search, senders, limit, page } = result.data;
	const offset = (page - 1) * limit;

	try {
		const filters = [];

		if (senders && senders.length > 0) {
			filters.push(inArray(messages.email, senders as string[]));
		}

		if (search) {
			filters.push(
				or(
					ilike(messages.name, `%${search}%`),
					ilike(messages.email, `%${search}%`),
					ilike(messages.message, `%${search}%`)
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
	} catch (err) {
		console.error('Error fetching messages:', err);
		return ApiResponse.internalServerError();
	}
};

/**
 * POST /messages
 * Creates a new message (contact form submission).
 */
export const POST: RequestHandler = async (event) => {
	const { request, fetch, url } = event;
	try {
		const queryParams = Object.fromEntries(url.searchParams);
		const body = await request.json();

		const queryResult = MessagesPostQuery.safeParse(queryParams);
		const bodyResult = MessagesPostBody.safeParse(body);

		if (!bodyResult.success) {
			return ApiResponse.badRequest(
				z.flattenError(bodyResult.error).fieldErrors as Record<string, string[]>
			);
		}

		// 1. Insert into database
		const insertData = bodyResult.data;
		const [insertedMessage] = await db.insert(messages).values(insertData).returning();

		// 2. Forward request to Google Apps Script (background task)
		const notify = queryResult.success ? queryResult.data.notify : true;

		if (notify) {
			waitUntil(
				fetch(GS_SEND_MESSAGE_URL, {
					method: 'POST',
					body: JSON.stringify(insertData)
				}).catch((err) => console.error('Google Apps Script Error:', err))
			);
		}

		return ApiResponse.created(Message.parse({ ...insertedMessage }), 'Message sent successfully');
	} catch (err) {
		console.error('Error creating message:', err);
		return ApiResponse.internalServerError();
	}
};
