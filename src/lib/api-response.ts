import type { ApiResponse as ApiResponseType } from '$lib/types';

/**
 * Standardized API response utilities for runtime usage.
 * Automatically uses standard HTTP status messages based on status codes.
 */
export default class ApiResponse {
	/**
	 * Creates a 200 OK response.
	 * @param data - Optional response data
	 */
	static ok(data?: unknown): Response {
		return Response.json(
			{
				success: true,
				message: 'OK',
				data
			} satisfies ApiResponseType,
			{ status: 200 }
		);
	}

	/**
	 * Creates a 201 Created response.
	 * @param data - Optional response data
	 */
	static created(data?: unknown): Response {
		return Response.json(
			{
				success: true,
				message: 'Created',
				data
			} satisfies ApiResponseType,
			{ status: 201 }
		);
	}

	/**
	 * Creates a 403 Forbidden response.
	 */
	static forbidden(): Response {
		return Response.json(
			{
				success: false,
				message: 'Forbidden'
			} satisfies ApiResponseType,
			{ status: 403 }
		);
	}

	/**
	 * Creates a 400 Bad Request response.
	 * @param errors - Optional field-level validation errors
	 */
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

	/**
	 * Creates a 401 Unauthorized response.
	 */
	static unauthorized(): Response {
		return Response.json(
			{
				success: false,
				message: 'Unauthorized'
			} satisfies ApiResponseType,
			{ status: 401 }
		);
	}

	/**
	 * Creates a 404 Not Found response.
	 */
	static notFound(): Response {
		return Response.json(
			{
				success: false,
				message: 'Not Found'
			} satisfies ApiResponseType,
			{ status: 404 }
		);
	}

	/**
	 * Creates a 502 Bad Gateway response.
	 */
	static badGateway(): Response {
		return Response.json(
			{
				success: false,
				message: 'Bad Gateway'
			} satisfies ApiResponseType,
			{ status: 502 }
		);
	}

	/**
	 * Creates a 500 Internal Server Error response.
	 * Never exposes error details to consumers for security.
	 */
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
