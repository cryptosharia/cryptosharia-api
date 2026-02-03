import { ApiResponse } from '$lib/types';
import { InsertMessage } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const messages: RouteConfig = {
	path: '/messages',
	method: 'post',
	summary: 'Send a message to CryptoSharia',
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
