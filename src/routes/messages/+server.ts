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
import { CONTACT_FORM_TO_EMAIL } from '$env/static/private';

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
					to: CONTACT_FORM_TO_EMAIL,
					replyTo: insertData.email,
					subject: `New Contact Message from ${safeName}`,
					html: `
						<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto;">
							<div style="padding: 18px 20px; background: #f97316; border-radius: 14px 14px 0 0;">
								<div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.9);">CryptoSharia</div>
								<div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 2px;">New contact form message</div>
							</div>
							<div style="padding: 18px 20px; border: 1px solid #eee; border-top: 0; border-radius: 0 0 14px 14px; background: #ffffff;">
								<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
									<div style="flex: 1 1 220px; padding: 12px 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
										<div style="font-size: 12px; color: #9a3412;">From</div>
										<div style="font-size: 14px; font-weight: 700; color: #431407;">${safeName}</div>
									</div>
									<div style="flex: 1 1 260px; padding: 12px 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
										<div style="font-size: 12px; color: #9a3412;">Email</div>
										<div style="font-size: 14px; font-weight: 600; color: #431407;">${safeEmail}</div>
									</div>
								</div>

								<div style="padding: 14px 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
									<div style="font-size: 12px; color: #9a3412;">Message</div>
									<div style="font-size: 14px; color: #431407; margin-top: 6px;">${safeMessage}</div>
								</div>

								<div style="margin-top: 14px; font-size: 12px; color: #666;">
									Tip: you can reply directly to this email to respond to ${safeEmail}.
								</div>
							</div>
						</div>
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
