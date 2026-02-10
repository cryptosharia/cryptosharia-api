import { GS_SEND_MESSAGE_URL } from '$env/static/private';
import { Message } from '$lib/db/types';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { MessagesGetQuery, MessagesGetItem, MessagesPostBody } from './index';
import { and, desc, ilike, inArray, or, sql } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions';

/**
 * GET /messages
 * Fetches messages with optional filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url }) => {
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

		const [messagesList, [{ count }]] = await Promise.all([
			db.query.messages.findMany({
				where,
				limit,
				offset,
				orderBy: [desc(messages.createdAt)]
			}),
			db
				.select({ count: sql<number>`count(*)` })
				.from(messages)
				.where(where)
		]);

		return ApiResponse.ok(
			{
				items: messagesList.map((m) => MessagesGetItem.parse({ ...m })),
				pagination: {
					total: Number(count),
					limit,
					page,
					pages: Math.ceil(Number(count) / limit)
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
	const { request, fetch } = event;
	try {
		const body = await request.json();
		const result = MessagesPostBody.safeParse(body);

		if (!result.success) {
			return ApiResponse.badRequest(
				z.flattenError(result.error).fieldErrors as Record<string, string[]>
			);
		}

		// 1. Insert into local database
		const [insertedMessage] = await db.insert(messages).values(result.data).returning();

		// 2. Send to Google Apps Script (background task)
		waitUntil(
			fetch(GS_SEND_MESSAGE_URL, {
				method: 'POST',
				body: JSON.stringify(result.data)
			}).catch((err) => console.error('Google Apps Script Error:', err))
		);

		return ApiResponse.created(
			Message.parse({ ...insertedMessage }),
			'Message sent successfully'
		);
	} catch (err) {
		console.error('Error creating message:', err);
		return ApiResponse.internalServerError();
	}
};
