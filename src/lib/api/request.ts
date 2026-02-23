import { parseSearchParams } from '$lib/utils';
import ApiResponse from '$lib/api/response';
import z from '$lib/zod-openapi';

type ParseOk<T> = { ok: true; data: T };
type ParseFail = { ok: false; response: Response };

export type ParseResult<T> = ParseOk<T> | ParseFail;

function toApiFieldErrors(
	fieldErrors: Record<string, string[] | undefined>
): Record<string, string[]> {
	const normalized: Record<string, string[]> = {};

	for (const [field, errors] of Object.entries(fieldErrors)) {
		if (errors && errors.length > 0) {
			normalized[field] = errors;
		}
	}

	return normalized;
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
	request: Request,
	schema: T
): Promise<ParseResult<z.infer<T>>> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return { ok: false, response: ApiResponse.badRequest({ body: ['Invalid JSON'] }) };
	}

	const result = schema.safeParse(body);
	if (!result.success) {
		return {
			ok: false,
			response: ApiResponse.badRequest(toApiFieldErrors(z.flattenError(result.error).fieldErrors))
		};
	}

	return { ok: true, data: result.data };
}

export function parseQueryParams<T extends z.ZodTypeAny>(
	url: URL,
	schema: T
): ParseResult<z.infer<T>> {
	const result = schema.safeParse(parseSearchParams(url));

	if (!result.success) {
		return {
			ok: false,
			response: ApiResponse.badRequest(toApiFieldErrors(z.flattenError(result.error).fieldErrors))
		};
	}

	return { ok: true, data: result.data };
}
