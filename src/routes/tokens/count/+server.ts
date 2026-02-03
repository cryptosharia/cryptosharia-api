import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import type { ApiResponse } from '$lib/types';
import { count, eq, or, ilike, and } from 'drizzle-orm';
import z from '$lib/zod-openapi';
import { GetTokensCountParams } from '.';

export async function GET({ url }) {
	const result = GetTokensCountParams.safeParse(Object.fromEntries(url.searchParams));

	if (!result.success) {
		return Response.json(
			{
				success: false,
				message: 'Invalid query parameters',
				errors: z.flattenError(result.error).fieldErrors
			} satisfies ApiResponse<undefined>,
			{ status: 400 }
		);
	}

	const { status, search } = result.data;
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

	return Response.json({
		success: true,
		message: 'Tokens count fetched successfully',
		data: total.value
	} satisfies ApiResponse<number>);
}
