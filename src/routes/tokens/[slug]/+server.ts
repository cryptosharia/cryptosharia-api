import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import { and, eq } from 'drizzle-orm';
import { TokensGetData } from '.';
import ApiResponse from '$lib/api-response';
import { getAssetUrl } from '$lib/assets';

export const GET: RequestHandler = async ({ params }) => {
	const { slug } = params;

	try {
		const token = await db.query.tokens.findFirst({
			where: and(eq(tokens.slug, slug), eq(tokens.status, 'published')),
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
			{
				...token,
				logo: token.logo
					? {
							id: token.logo.id,
							url: getAssetUrl(token.logo),
							filename: token.logo.filename,
							size: token.logo.size,
							mimeType: token.logo.mimeType,
							width: token.logo.width,
							height: token.logo.height
						}
					: null
			} as TokensGetData,
			'Token retrieved successfully'
		);
	} catch (err) {
		console.error('Error fetching token by slug:', err);
		return ApiResponse.internalServerError();
	}
};
