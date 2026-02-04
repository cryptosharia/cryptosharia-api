import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import ApiResponse from '$lib/api-response';
import z from '$lib/zod-openapi';
import { count, or, ilike, and, inArray } from 'drizzle-orm';
import { shariaStatusEnum } from '$lib/db/tables';
import { GetTokensCountParams } from '.';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const result = GetTokensCountParams.safeParse(Object.fromEntries(url.searchParams));

	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { 'sharia-statuses': shariaStatuses, search } = result.data;

	try {
		const filters = [];

		if (shariaStatuses && (shariaStatuses as string[]).length > 0) {
			filters.push(
				inArray(
					tokens.shariaStatus,
					shariaStatuses as (typeof shariaStatusEnum.enumValues)[number][]
				)
			);
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

		return ApiResponse.ok<number>(total.value);
	} catch (err) {
		console.error('Error fetching tokens count:', err);
		return ApiResponse.internalServerError();
	}
};
