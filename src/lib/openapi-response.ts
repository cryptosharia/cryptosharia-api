import { ApiResponse as ApiResponseSchema } from '$lib/types';
import z from './zod-openapi';

export default class OpenApiResponse {
	static ok<T extends z.ZodTypeAny>(schema?: T) {
		return {
			200: {
				description: 'OK',
				content: {
					'application/json': {
						schema: schema ? ApiResponseSchema.extend({ data: schema }) : ApiResponseSchema
					}
				}
			}
		};
	}

	static created<T extends z.ZodTypeAny>(schema?: T) {
		return {
			201: {
				description: 'Created',
				content: {
					'application/json': {
						schema: schema ? ApiResponseSchema.extend({ data: schema }) : ApiResponseSchema
					}
				}
			}
		};
	}

	static badRequest(description = 'Bad Request') {
		return {
			400: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	static unauthorized(description = 'Unauthorized') {
		return {
			401: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 403 Forbidden OpenAPI response.
	 */
	static forbidden(description = 'Forbidden') {
		return {
			403: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 404 Not Found OpenAPI response.
	 */
	static notFound(description = 'Not Found') {
		return {
			404: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 502 Bad Gateway OpenAPI response.
	 */
	static badGateway() {
		return {
			502: {
				description: 'Bad Gateway',
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 409 Conflict OpenAPI response.
	 */
	static conflict(description = 'Conflict') {
		return {
			409: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 500 Internal Server Error OpenAPI response.
	 */
	static internalServerError() {
		return {
			500: {
				description: 'Internal Server Error',
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}
}
