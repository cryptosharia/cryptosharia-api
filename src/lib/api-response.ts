import type { ApiResponse as ApiResponseType } from '$lib/types';

/**
 * Standardized API response utilities for runtime usage.
 * Automatically uses standard HTTP status messages based on status codes.
 */
export default class ApiResponse {
	static ok<T>(data?: T, message = 'OK'): Response {
		return Response.json(
			{
				success: true,
				message,
				data
			} satisfies ApiResponseType<T>,
			{ status: 200 }
		);
	}

	static created<T>(data?: T, message = 'Created'): Response {
		return Response.json(
			{
				success: true,
				message,
				data
			} satisfies ApiResponseType<T>,
			{ status: 201 }
		);
	}

	static forbidden(message = 'Forbidden'): Response {
		return Response.json(
			{
				success: false,
				message
			} satisfies ApiResponseType,
			{ status: 403 }
		);
	}

	static badRequest(errors?: Record<string, string[]>): Response {
		return Response.json(
			{
				success: false,
				message: 'Bad Request',
				errors
			} satisfies ApiResponseType,
			{ status: 400 }
		);
	}

	static unauthorized(message = 'Unauthorized'): Response {
		return Response.json(
			{
				success: false,
				message
			} satisfies ApiResponseType,
			{ status: 401 }
		);
	}

	static notFound(): Response {
		return Response.json(
			{
				success: false,
				message: 'Not Found'
			} satisfies ApiResponseType,
			{ status: 404 }
		);
	}

	static badGateway(): Response {
		return Response.json(
			{
				success: false,
				message: 'Bad Gateway'
			} satisfies ApiResponseType,
			{ status: 502 }
		);
	}

	static internalServerError(): Response {
		return Response.json(
			{
				success: false,
				message: 'Internal Server Error'
			} satisfies ApiResponseType,
			{ status: 500 }
		);
	}
}
