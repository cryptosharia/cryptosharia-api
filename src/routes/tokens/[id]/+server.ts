import type { RequestHandler } from './$types';
import { TokensDetailGetParams, TokensGetData, TokensUpdateBody } from '..';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { db } from '$lib/db';
import { assets, tokenTags, tokens } from '$lib/db/tables';
import { and, eq, ne, or } from 'drizzle-orm';
import { requirePermission } from '$lib/auth/permissions';
import {
	fetchTokenDetail,
	findTokenByIdentifier,
	resolveTokenTagIdentifiers
} from '$lib/services/tokens';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const token = await fetchTokenDetail(locals, params.id);

		if (!token) {
			return ApiResponse.notFound('Token not found');
		}

		return ApiResponse.ok<TokensGetData>(
			TokensGetData.parse(token),
			'Token retrieved successfully'
		);
	} catch (error) {
		console.error('GET /tokens/[id] error:', error);
		return ApiResponse.internalServerError('Failed to retrieve token details');
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const authError = requirePermission(locals, 'tokens.manage');
	if (authError) return authError;

	const parsedBody = await parseJsonBody(request, TokensUpdateBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	try {
		const { id } = TokensDetailGetParams.parse(params);
		const existingToken = await findTokenByIdentifier(id);
		if (!existingToken) {
			return ApiResponse.notFound('Token not found');
		}

		const {
			name,
			ticker,
			slug,
			rank,
			shariaStatus,
			status,
			excerpt,
			content,
			website,
			tradingviewSymbol,
			logoId,
			tags
		} = parsedBody.data;

		if ((slug && slug !== existingToken.slug) || (ticker && ticker !== existingToken.ticker)) {
			const duplicateFilters = [];

			if (slug && slug !== existingToken.slug) {
				duplicateFilters.push(eq(tokens.slug, slug));
			}

			if (ticker && ticker !== existingToken.ticker) {
				duplicateFilters.push(eq(tokens.ticker, ticker));
			}

			const duplicateToken = await db.query.tokens.findFirst({
				where: and(
					duplicateFilters.length > 1 ? or(...duplicateFilters) : duplicateFilters[0],
					ne(tokens.id, existingToken.id)
				)
			});

			if (duplicateToken) {
				return ApiResponse.conflict('Token with this slug or ticker already exists');
			}
		}

		if (logoId) {
			const asset = await db.query.assets.findFirst({ where: eq(assets.id, logoId) });
			if (!asset) {
				return ApiResponse.badRequest({ logoId: ['Logo asset not found'] });
			}
		}

		let resolvedTagIds: string[] | undefined;
		if (tags !== undefined) {
			const tagResolution = await resolveTokenTagIdentifiers(tags);
			if (!tagResolution.ok) {
				return ApiResponse.badRequest({
					tags: [`Unknown tag identifier(s): ${tagResolution.missingIdentifiers.join(', ')}`]
				});
			}

			resolvedTagIds = tagResolution.tagIds;
		}

		const userId = locals.user?.id;
		const publishedAt =
			status === undefined
				? undefined
				: status === 'published'
					? (existingToken.publishedAt ?? new Date())
					: null;

		await db.transaction(async (tx) => {
			await tx
				.update(tokens)
				.set({
					name,
					ticker,
					slug,
					rank,
					shariaStatus,
					status,
					excerpt,
					content,
					website,
					tradingviewSymbol,
					logoId,
					publishedAt,
					updatedBy: userId
				})
				.where(eq(tokens.id, existingToken.id));

			if (resolvedTagIds !== undefined) {
				await tx.delete(tokenTags).where(eq(tokenTags.tokenId, existingToken.id));

				if (resolvedTagIds.length > 0) {
					await tx.insert(tokenTags).values(
						resolvedTagIds.map((tagId) => ({
							tokenId: existingToken.id,
							tagId
						}))
					);
				}
			}
		});

		const token = await fetchTokenDetail(locals, existingToken.id);
		if (!token) {
			return ApiResponse.internalServerError('Failed to update token');
		}

		return ApiResponse.ok<TokensGetData>(TokensGetData.parse(token), 'Token updated successfully');
	} catch (error) {
		console.error('PATCH /tokens/[id] error:', error);
		return ApiResponse.internalServerError('Failed to update token');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const authError = requirePermission(locals, 'tokens.manage');
	if (authError) return authError;

	try {
		const { id } = TokensDetailGetParams.parse(params);
		const existingToken = await findTokenByIdentifier(id);

		if (!existingToken) {
			return ApiResponse.notFound('Token not found');
		}

		await db.delete(tokens).where(eq(tokens.id, existingToken.id));

		return ApiResponse.ok({ message: 'Token deleted successfully' }, 'Token deleted successfully');
	} catch (error) {
		console.error('DELETE /tokens/[id] error:', error);
		return ApiResponse.internalServerError('Failed to delete token');
	}
};
