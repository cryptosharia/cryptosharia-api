import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import { count, eq, or, ilike, and } from 'drizzle-orm';
import { GetTokensCountParams } from '.';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const result = GetTokensCountParams.safeParse(Object.fromEntries(url.searchParams));

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { status, search } = result.data;

	try {
		const filters = [];

		if (status !== 'all') {
			filters.push(eq(tokens.shariaStatus, status));
		}

		if (search) {
			const query = `%${search}%`;
			filters.push(
				or(ilike(tokens.name, query), ilike(tokens.ticker, query), ilike(tokens.slug, query))
			);
		}

		const [total] = await db
			.select({ value: count() })
			.from(tokens)
			.where(filters.length > 0 ? and(...filters) : undefined);

		return ApiResponse.ok(total.value);
	} catch (err) {
		console.error('Error fetching tokens count:', err);
		return ApiResponse.internalServerError();
	}
};
