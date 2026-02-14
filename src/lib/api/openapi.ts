import { ApiResponse as ApiResponseSchema } from './schemas';
import z from '$lib/zod-openapi';

export default class OpenApiResponse {
	static ok<T extends z.ZodTypeAny>(schema?: T, description = 'OK') {
		return {
			200: {
				description,
				content: {
					'application/json': {
						schema: schema ? ApiResponseSchema.extend({ data: schema }) : ApiResponseSchema
					}
				}
			}
		};
	}

	static created<T extends z.ZodTypeAny>(schema?: T, description = 'Created') {
		return {
			201: {
				description,
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
	static badGateway(description = 'Bad Gateway') {
		return {
			502: {
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
	static internalServerError(description = 'Internal Server Error') {
		return {
			500: {
				description,
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}
}
