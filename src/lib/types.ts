import type { InferSelectModel } from 'drizzle-orm';
import * as schema from './server/db/schema';
import { createSelectSchema } from 'drizzle-zod';
import z from './zod-openapi';

export type Post = InferSelectModel<typeof schema.posts>;
export const Post = createSelectSchema(schema.posts).openapi('Post');

export type Token = InferSelectModel<typeof schema.tokens>;
export const Token = createSelectSchema(schema.tokens).openapi('Token');

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
