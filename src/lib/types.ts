import z from './zod-openapi';

// --- Global Application Types ---

/**
 * Common shape for all API responses.
 * Reserved for general application types, not tied to a specific DB table.
 */
export type ApiResponse<T = unknown> = {
	success: boolean;
	message: string;
	errors?: Record<string, string[]>;
	data?: T;
};

export const ApiResponse = z
	.object({
		success: z.boolean(),
		message: z.string(),
		errors: z.record(z.string(), z.array(z.string())).optional(),
		data: z.any().optional()
	})
	.openapi('ApiResponse');
