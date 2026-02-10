import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { TokensGetData } from '..';
import ApiResponse from '$lib/api-response';
import { toAssetMetadata } from '$lib/assets';

export const GET: RequestHandler = async ({ params }: { params: { id: string } }) => {
	const { id } = params;

	try {
		const token = await db.query.tokens.findFirst({
			where: eq(tokens.id, id),
			columns: {
				logoId: false
			},
			with: {
				logo: true,
				createdBy: {
					columns: {
						id: true,
						name: true,
						email: true
					}
				},
				updatedBy: {
					columns: {
						id: true,
						name: true,
						email: true
					}
				}
			}
		});

		if (!token) {
			return ApiResponse.notFound();
		}

		return ApiResponse.ok<TokensGetData>(
			TokensGetData.parse({
				...token,
				logo: toAssetMetadata(token.logo)
			}),
			'Token retrieved successfully'
		);
	} catch (err) {
		console.error('Error fetching token by ID:', err);
		return ApiResponse.internalServerError();
	}
};
