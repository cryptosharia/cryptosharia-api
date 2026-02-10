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

// --- User Metadata (Audit) ---

/**
 * Shared schema for human-readable audit metadata (createdBy/updatedBy).
 */
export const UserMetadata = z
	.object({
		id: z.uuid(),
		name: z.string(),
		email: z.email()
	})
	.openapi('UserMetadata');

export type UserMetadata = z.infer<typeof UserMetadata>;

// --- Pagination Types ---

export const Pagination = z
	.object({
		total: z.number().describe('Total number of items matching the filters'),
		page: z.number().describe('Current page number'),
		limit: z.number().describe('Number of items per page'),
		totalPages: z.number().describe('Total number of pages')
	})
	.openapi('Pagination');

export type Pagination = z.infer<typeof Pagination>;

/**
 * Creates a paginated response schema for a given item schema.
 */
export const PaginatedData = <T extends z.ZodTypeAny>(itemSchema: T, name: string) =>
	z
		.object({
			items: z.array(itemSchema),
			pagination: Pagination
		})
		.openapi(`Paginated${name}`);

export type PaginatedData<T> = {
	items: T[];
	pagination: Pagination;
};
