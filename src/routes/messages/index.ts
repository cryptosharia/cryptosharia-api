import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { InsertMessage, Message } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

// Schema for GET query parameters
export const GetMessagesParams = z
	.object({
		search: z.string().optional(),
		senders: zQueryArray(z.email(), {
			description:
				'List of sender emails to filter by.<br>Example: example1@gmail.com,example2@gmail.com'
		}),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('GetMessagesParams', {
		description: 'Query parameters for fetching messages with filtering and pagination'
	});

export const messagesGet: RouteConfig = {
	path: '/messages',
	method: 'get',
	summary: 'List Messages',
	description:
		'Retrieve a list of messages with support for search, sender filtering, and pagination.',
	request: {
		query: GetMessagesParams
	},
	responses: {
		...OpenApiResponse.ok(z.array(Message)),
		...OpenApiResponse.internalServerError()
	}
};

export const messagesPost: RouteConfig = {
	path: '/messages',
	method: 'post',
	summary: 'Create Message',
	description: 'Submit a new contact or inquiry message.',
	request: {
		body: {
			content: {
				'application/json': {
					schema: InsertMessage
				}
			}
		}
	},
	responses: {
		...OpenApiResponse.created(),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.internalServerError()
	}
};
