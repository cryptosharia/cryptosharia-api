/**
 * API Framework Layer — barrel export.
 *
 * Re-exports ApiResponse (runtime), OpenApiResponse (spec),
 * and shared Zod schemas.
 *
 * Note: `z` is imported separately from '$lib/zod-openapi' as it's
 * a foundational dependency, not API-specific.
 */
export { default as ApiResponse } from './response';
export { default as OpenApiResponse } from './openapi';
export {
	ApiResponse as ApiResponseSchema,
	PaginatedData,
	UserMetadata,
	AssetMetadata
} from './schemas';
