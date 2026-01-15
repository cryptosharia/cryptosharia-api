import type { InferSelectModel } from 'drizzle-orm';
import * as schema from './server/db/schema';
import { createSelectSchema } from 'drizzle-zod';
import z from './zod-openapi';

// TypeScript type for API responses
export type ApiResponse<T = unknown> = {
	success: boolean;
	message: string;
	errors?: Record<string, string[]>;
	data?: T;
};

// Zod schema for API responses
export const ApiResponse = z
	.object({
		success: z.boolean(),
		message: z.string(),
		errors: z.record(z.string(), z.array(z.string())).optional(),
		data: z.any().optional()
	})
	.openapi('ApiResponse');

export type Post = InferSelectModel<typeof schema.posts>;
export const Post = createSelectSchema(schema.posts).openapi('Post');

export type Token = InferSelectModel<typeof schema.tokens>;
export const Token = createSelectSchema(schema.tokens).openapi('Token');

export type Message = InferSelectModel<typeof schema.messages>;
export const Message = createSelectSchema(schema.messages, {
	name: (s) =>
		s
			.trim()
			.min(1, { message: 'Name cannot be empty' })
			.max(100, { message: 'Name must be at most 100 characters long' }),
	message: (s) =>
		s
			.min(10, { message: 'Message must be at least 10 characters long' })
			.max(5000, { message: 'Message must be at most 5000 characters long' })
}).extend({
	// Use extend (override) for "email" to solve "string().email()" deprecation
	email: z.email().max(255, { message: 'Email must be at most 255 characters long' })
});
