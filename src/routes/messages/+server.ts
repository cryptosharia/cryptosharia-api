import { GS_SEND_MESSAGE_URL } from '$env/static/private';
import { InsertMessage } from '$lib/db/types';
import z from '$lib/zod-openapi';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { messages } from '$lib/db/tables';
import { GetMessagesParams } from './index';
import { and, desc, ilike, inArray, or } from 'drizzle-orm';
import { ApiResponse } from '$lib/utils';

/**
 * GET /messages
 * Fetches messages with optional filtering, searching, and pagination.
 * Query params: search, senders (comma-separated emails), limit, page
 */
export const GET: RequestHandler = async ({ url }) => {
	// Parse and validate query parameters from URL
	const result = GetMessagesParams.safeParse(Object.fromEntries(url.searchParams));

	// Return 400 if validation fails
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	// Extract validated parameters
	const { search, senders, limit, page } = result.data;
	const offset = (page - 1) * limit; // Calculate offset for pagination

	try {
		const filters = [];

		// Filter by sender emails if provided
		// 'senders' is automatically parsed from comma-separated string to array via z.preprocess
		if (senders && senders.length > 0) {
			filters.push(inArray(messages.email, senders));
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
		const data = await db.query.messages.findMany({
			where: filters.length > 0 ? and(...filters) : undefined, // Combine filters with AND
			orderBy: [desc(messages.createdAt)], // Newest first
			limit,
			offset
		});

		return ApiResponse.ok(data);
	} catch (err) {
		console.error('Error fetching messages:', err);
		return ApiResponse.internalServerError();
	}
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	// 1. Safe Parse Body
	let body;

	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest();
	}

	// 2. Validate Data
	const result = InsertMessage.safeParse(body);

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { name, email, message } = result.data;

	try {
		// 3. Save to Database first (most important)
		await db.insert(messages).values({ name, email, message });

		// 4. Forward Request to Google Script (optional notification)
		if (GS_SEND_MESSAGE_URL) {
			try {
				const res = await fetch(GS_SEND_MESSAGE_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, email, message })
				});

				if (!res.ok) {
					console.error('Google Script forwarding failed:', res.statusText);
				}
			} catch (fetchErr) {
				console.error('Google Script fetch error:', fetchErr);
			}
		} else {
			console.warn('GS_SEND_MESSAGE_URL not configured, skipping Google Script');
		}

		// Always return success if DB save succeeded
		return ApiResponse.created();
	} catch (err) {
		console.error('Message processing error:', err);
		return ApiResponse.internalServerError();
	}
};
