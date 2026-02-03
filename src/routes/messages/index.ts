import { ApiResponse } from '$lib/types';
import { InsertMessage, Message } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

// Schema for GET query parameters
export const GetMessagesParams = z
	.object({
		search: z.string().optional(),
		senders: z
			.preprocess((val) => {
				if (typeof val === 'string') {
					return val
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean);
				}
				return val;
			}, z.array(z.email()).optional())
			.openapi({
				description: 'List of sender emails to filter by',
				param: {
					style: 'form',
					explode: false // This makes it comma-separated: ?senders=email1,email2
				},
				example: 'example1@gmail.com,example2@gmail.com'
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
	summary: 'Fetch Messages',
	request: {
		query: GetMessagesParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.array(Message)
					})
				}
			}
		},
		500: {
			description: 'Internal Server Error',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};

export const messagesPost: RouteConfig = {
	path: '/messages',
	method: 'post',
	summary: 'Send a Message',
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
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		},
		400: {
			description: 'Bad Request',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};
