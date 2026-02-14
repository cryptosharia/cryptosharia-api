import z from './zod-openapi';

/**
 * Escapes PostgreSQL LIKE/ILIKE special characters to prevent wildcard abuse (DoS vector).
 */
export function escapeLikePattern(pattern: string): string {
	return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Parses URL search params into a plain object suitable for Zod validation.
 * Handles multi-value params (e.g. `?a=1&a=2`) by converting to arrays.
 */
export function parseSearchParams(url: URL): Record<string, string | string[] | null> {
	return Object.fromEntries(
		Array.from(url.searchParams.keys()).map((key) => [
			key,
			url.searchParams.getAll(key).length > 1
				? url.searchParams.getAll(key)
				: url.searchParams.get(key)
		])
	);
}

/**
 * Helper for defining comma-separated query parameters in OpenAPI.
 * Automatically handles preprocessing from string to array and sets OpenAPI metadata.
 * @param itemSchema - The schema for individual items in the array
 * @param metadata - Description and optional example for the parameter
 */
export const zQueryArray = (
	itemSchema: z.ZodTypeAny,
	metadata: { description: string; example?: string; required?: boolean }
) => {
	const baseSchema = z.array(itemSchema);
	const schema = metadata.required ? baseSchema : baseSchema.optional();

	return z
		.preprocess((val) => {
			if (typeof val === 'string') {
				return val
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
			}
			return val;
		}, schema)
		.openapi({
			description: metadata.description,
			param: {
				style: 'form',
				explode: false,
				required: metadata.required
			},
			example: metadata.example
		});
};

/**
 * Helper for boolean query parameters (e.g. `?notify=true`).
 * Preprocesses string values to booleans for Zod validation.
 */
export const zBooleanQuery = (description: string) =>
	z
		.preprocess(
			(val) => (typeof val === 'string' ? val === 'true' || val === '1' : val),
			z.boolean().optional().default(true)
		)
		.openapi({ description, param: { required: false } });

/**
 * Helper to prevent HTML injection attacks by escaping unsafe characters.
 */
export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
