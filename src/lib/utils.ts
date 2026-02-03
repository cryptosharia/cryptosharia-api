import z from './zod-openapi';

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
