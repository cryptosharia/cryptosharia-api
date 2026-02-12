import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Message } from '$lib/db/types';
import { PaginatedData } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating message query parameters.
 */
export const MessagesGetQuery = z
	.object({
		search: z.string().optional(),
		senders: zQueryArray(z.email(), {
			description:
				'List of sender emails to filter by.<br>Example: example1@gmail.com,example2@gmail.com'
		}),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('MessagesGetQuery', {
		description: 'Query parameters for fetching messages with filtering and pagination'
	});

export const MessagesGetItem = Message.openapi('MessagesGetItem');
export type MessagesGetItem = z.infer<typeof MessagesGetItem>;

/**
 * Zod schema for sending a new message.
 */
export const MessagesPostBody = Message.pick({
	name: true,
	email: true,
	message: true
}).openapi('MessagesPostBody');

export type MessagesPostBody = z.infer<typeof MessagesPostBody>;

export const MessagesPostQuery = z
	.object({
		notify: z
			.preprocess((val) => {
				if (val === 'true') return true;
				if (val === 'false') return false;
				return val;
			}, z.boolean())
			.default(true)
			.describe('Whether to trigger an external notification (e.g. email)')
	})
	.openapi('MessagesPostQuery');
export type MessagesPostQuery = z.infer<typeof MessagesPostQuery>;

export const messagesGet: RouteConfig = {
	path: '/messages',
	method: 'get',
	summary: 'List Messages',
	description:
		'Retrieve a list of messages with support for search, sender filtering, and pagination.',
	request: {
		query: MessagesGetQuery
	},
	responses: {
		...OpenApiResponse.ok(
			PaginatedData(MessagesGetItem, 'MessagesGetItem'),
			'Paginated list of messages retrieved successfully'
		),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to retrieve messages due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};

export const messagesPost: RouteConfig = {
	path: '/messages',
	method: 'post',
	summary: 'Send Message',
	description: 'Create a new message from the contact form.',
	request: {
		query: MessagesPostQuery,
		body: {
			content: {
				'application/json': {
					schema: MessagesPostBody
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(Message, 'Message sent successfully'),
		...OpenApiResponse.badRequest('Invalid form data provided'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError('Failed to send message due to an internal server error')
	},
	security: [{ ApiKeyAuth: [] }]
};
