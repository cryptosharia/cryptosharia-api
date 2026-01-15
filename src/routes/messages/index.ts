import { ApiResponse, Message } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const PostMessagesBody = Message.pick({
	name: true,
	email: true,
	message: true
}).openapi({
	example: {
		name: 'John Doe',
		email: 'john@example.com',
		message: 'Hello, I have a question about...'
	}
});

export const messages: RouteConfig = {
	path: '/messages',
	method: 'post',
	summary: 'Send a message to CryptoSharia',
	request: {
		body: {
			content: {
				'application/json': {
					schema: PostMessagesBody
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
