import type { RequestHandler } from './$types';
import { TokensGetData } from '..';
import { ApiResponse } from '$lib/api';
import { fetchTokenDetail } from '$lib/services/tokens';

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
