import { GS_SEND_MESSAGE_URL } from '$env/static/private';
import { InsertMessage, Message } from '$lib/db/types';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { GetMessagesParams } from './index';
import { and, desc, ilike, inArray, or } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions';
/**
 * GET /messages
 * Fetches messages with optional filtering, searching, and pagination.
 * Query params: search, senders (comma-separated emails), limit, page
 */
export const GET: RequestHandler = async ({ url }) => {
	// Parse and validate query parameters from URL
	const params = Object.fromEntries(url.searchParams);
	const result = GetMessagesParams.safeParse(params);

	// Return 400 if validation fails
	if (!result.success) {
		return ApiResponse.badRequest(
			z.flattenError(result.error).fieldErrors as Record<string, string[]>
		);
	}

	// Extract validated parameters
	const { search, senders, limit, page } = result.data;
	const offset = (page - 1) * limit; // Calculate offset for pagination

	try {
		const filters = [];

		// Filter by sender emails if provided
		// 'senders' is automatically parsed from comma-separated string to array via z.preprocess
		if (senders && (senders as string[]).length > 0) {
			filters.push(inArray(messages.email, senders as string[]));
		}

		// Search across name, email, and message content if search term provided
		if (search) {
			filters.push(
				or(
					ilike(messages.name, `%${search}%`),
					ilike(messages.email, `%${search}%`),
					ilike(messages.message, `%${search}%`)
				)
			);
		}

		// Fetch messages from database with applied filters and pagination
		const messagesList = await db.query.messages.findMany({
			where: filters.length > 0 ? and(...filters) : undefined,
			limit,
			offset,
			orderBy: [desc(messages.createdAt)]
		});

		// Return successful response with data
		return ApiResponse.ok<Message[]>(messagesList);
	} catch (err) {
		console.error('Error fetching messages:', err);
		return ApiResponse.internalServerError();
	}
};

/**
 * POST /messages
 * Creates a new message (contact form submission).
 * Also sends the message to a Google Apps Script endpoint for email notification.
 */
export const POST: RequestHandler = async (event) => {
	const { request, fetch } = event;
	try {
		// Parse request body
		const body = await request.json();

		// Validate input using InsertMessage schema
		const result = InsertMessage.safeParse(body);

		// Return 400 if validation fails
		if (!result.success) {
			return ApiResponse.badRequest(
				z.flattenError(result.error).fieldErrors as Record<string, string[]>
			);
		}

		// 1. Insert into local database
		const [insertedMessage] = await db.insert(messages).values(result.data).returning();

		// 2. Send to Google Apps Script (background task)
		// waitUntil ensures the process doesn't terminate by Vercel serverless before the fetch completes
		waitUntil(
			fetch(GS_SEND_MESSAGE_URL, {
				method: 'POST',
				body: JSON.stringify(result.data)
			}).catch((err) => console.error('Google Apps Script Error:', err))
		);

		// Return 201 Created on success with the inserted message
		return ApiResponse.created<Message>(insertedMessage);
	} catch (err) {
		console.error('Error creating message:', err);
		return ApiResponse.internalServerError();
	}
};
