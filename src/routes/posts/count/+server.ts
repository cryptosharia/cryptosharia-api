import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import type { ApiResponse } from '$lib/types';
import { count, eq, or, ilike, and } from 'drizzle-orm';
import z from '$lib/zod-openapi';
import { GetPostsCountParams } from '.';

export async function GET({ url }) {
	const result = GetPostsCountParams.safeParse(Object.fromEntries(url.searchParams));

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

	const { category, search } = result.data;
	const filters = [];

	if (category !== 'all') {
		filters.push(eq(posts.section, category));
	}

	if (search) {
		const query = `%${search}%`;
		filters.push(
			or(ilike(posts.title, query), ilike(posts.content, query), ilike(posts.slug, query))
		);
	}

	const [total] = await db
		.select({ value: count() })
		.from(posts)
		.where(filters.length > 0 ? and(...filters) : undefined);

	return Response.json({
		success: true,
		message: 'Posts count fetched successfully',
		data: total.value
	} satisfies ApiResponse<number>);
}
