import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { TokensCreateBody, TokensGetData, TokensGetItem, TokensGetQuery } from '.';
import { ApiResponse, PaginatedData } from '$lib/api';
import { parseJsonBody, parseQueryParams } from '$lib/api/request';
import { toAssetMetadata } from '$lib/services/assets';
import {
	assets,
	tokens,
	shariaStatusEnum,
	contentStatusEnum,
	tokenTags,
	tags
} from '$lib/db/tables';
import { and, ilike, inArray, notInArray, or, count, eq } from 'drizzle-orm';
import { escapeLikePattern } from '$lib/utils';

import { hasPermission, requirePermission } from '$lib/auth/permissions';
import { fetchTokenDetail, resolveTokenTagIdentifiers } from '$lib/services/tokens';
import { logActivity } from '$lib/services/activity-logger';

/**
 * Handles GET requests to fetch tokens with filtering, searching, and pagination.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const parsedQuery = parseQueryParams(url, TokensGetQuery);
	if (!parsedQuery.ok) {
		return parsedQuery.response;
	}

	const {
		shariaStatuses,
		slugs,
		tags: tagFilters,
		search,
		limit,
		page,
		exclude,
		statuses
	} = parsedQuery.data;
	const offset = (page - 1) * limit;

	if (statuses && statuses.some((s) => s !== 'published')) {
		if (!hasPermission(locals, 'tokens.manage')) {
			return ApiResponse.forbidden(
				'You do not have permission to access content with the requested statuses.'
			);
		}
	}

	try {
		const getFilters = (table: typeof tokens) => {
			const filters = [];

			if (shariaStatuses && shariaStatuses.length > 0) {
				filters.push(
					inArray(
						table.shariaStatus,
						shariaStatuses as (typeof shariaStatusEnum.enumValues)[number][]
					)
				);
			}

			if (slugs && slugs.length > 0) {
				filters.push(inArray(table.slug, slugs as string[]));
			}

			if (tagFilters && tagFilters.length > 0) {
				const matchingTokenIds = db
					.select({ tokenId: tokenTags.tokenId })
					.from(tokenTags)
					.innerJoin(tags, eq(tokenTags.tagId, tags.id))
					.where(inArray(tags.slug, tagFilters as string[]));

				filters.push(inArray(table.id, matchingTokenIds));
			}

			if (search) {
				const query = `%${escapeLikePattern(search)}%`;
				filters.push(
					or(ilike(table.name, query), ilike(table.ticker, query), ilike(table.slug, query))
				);
			}

			if (exclude && (exclude as string[]).length > 0) {
				filters.push(notInArray(table.slug, exclude as string[]));
			}

			let allowedStatuses = statuses;

			if (!allowedStatuses && !hasPermission(locals, 'tokens.manage')) {
				allowedStatuses = ['published'];
			}

			if (allowedStatuses && allowedStatuses.length > 0) {
				filters.push(
					inArray(table.status, allowedStatuses as (typeof contentStatusEnum.enumValues)[number][])
				);
			}

			return filters.length > 0 ? and(...filters) : undefined;
		};

		const [tokensList, [countResult]] = await Promise.all([
			db.query.tokens.findMany({
				where: getFilters(tokens),
				limit,
				offset,
				columns: {
					content: false,
					logoId: false
				},
				with: {
					logo: true,
					tags: {
						columns: {},
						with: {
							tag: {
								columns: {
									id: true,
									name: true,
									slug: true
								}
							}
						}
					},
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
				},
				orderBy: (table, { asc }) => [asc(table.rank)]
			}),
			db.select({ value: count() }).from(tokens).where(getFilters(tokens))
		]);

		const total = countResult.value;

		return ApiResponse.ok<PaginatedData<TokensGetItem>>(
			{
				items: tokensList.map((t) =>
					TokensGetItem.parse({
						...t,
						tags: t.tags.map((tokenTag) => tokenTag.tag),
						logo: toAssetMetadata(t.logo)
					})
				),
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit)
				}
			},
			'Tokens retrieved successfully'
		);
	} catch (error) {
		console.error('Fetch tokens error:', error);
		return ApiResponse.internalServerError('Failed to retrieve tokens');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requirePermission(locals, 'tokens.manage');
	if (authError) return authError;

	const parsedBody = await parseJsonBody(request, TokensCreateBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
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
		tags: tagIdentifiers
	} = parsedBody.data;

	try {
		const [existingToken, existingAsset] = await Promise.all([
			db.query.tokens.findFirst({ where: or(eq(tokens.slug, slug), eq(tokens.ticker, ticker)) }),
			db.query.assets.findFirst({ where: eq(assets.id, logoId) })
		]);

		if (existingToken) {
			return ApiResponse.conflict('Token with this slug or ticker already exists');
		}

		if (!existingAsset) {
			return ApiResponse.badRequest({ logoId: ['Logo asset not found'] });
		}

		let resolvedTagIds: string[] = [];
		if (tagIdentifiers !== undefined) {
			const tagResolution = await resolveTokenTagIdentifiers(tagIdentifiers);
			if (!tagResolution.ok) {
				return ApiResponse.badRequest({
					tags: [`Unknown tag identifier(s): ${tagResolution.missingIdentifiers.join(', ')}`]
				});
			}

			resolvedTagIds = tagResolution.tagIds;
		}

		const publishedAt = status === 'published' ? new Date() : null;
		const userId = locals.user?.id;

		const createdTokenId = await db.transaction(async (tx) => {
			const [createdToken] = await tx
				.insert(tokens)
				.values({
					name,
					ticker,
					slug,
					rank,
					shariaStatus,
					status,
					excerpt,
					content,
					website,
					tradingviewSymbol: tradingviewSymbol ?? null,
					logoId,
					publishedAt,
					createdBy: userId,
					updatedBy: userId
				})
				.returning({ id: tokens.id });

			if (resolvedTagIds.length > 0) {
				await tx.insert(tokenTags).values(
					resolvedTagIds.map((tagId) => ({
						tokenId: createdToken.id,
						tagId
					}))
				);
			}

			return createdToken.id;
		});

		const token = await fetchTokenDetail(locals, createdTokenId);
		if (!token) {
			return ApiResponse.internalServerError('Failed to create token');
		}

		if (userId) {
			await logActivity({
				userId,
				action: 'token.create',
				subjectType: 'tokens',
				subjectId: createdTokenId,
				description: `Created token ${slug}`,
				ipAddress: locals.clientIp
			});
		}

		return ApiResponse.created<TokensGetData>(
			TokensGetData.parse(token),
			'Token created successfully'
		);
	} catch (error) {
		console.error('Create token error:', error);
		return ApiResponse.internalServerError('Failed to create token');
	}
};
