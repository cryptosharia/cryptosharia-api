import { ApiResponse as ApiResponseSchema } from '$lib/types';
import z from './zod-openapi';

/**
 * Utility for generating standardized OpenAPI response objects.
 * Mimics the class-based pattern of the runtime ApiResponse utility.
 */
export default class OpenApiResponse {
	/**
	 * Creates a standardized 200 OK OpenAPI response.
	 * @param schema - Optional Zod schema for the 'data' field
	 */
	static ok(schema?: z.ZodTypeAny) {
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

	/**
	 * Creates a standardized 201 Created OpenAPI response.
	 * @param schema - Optional Zod schema for the 'data' field
	 */
	static created(schema?: z.ZodTypeAny) {
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

	/**
	 * Creates a standardized 400 Bad Request OpenAPI response.
	 */
	static badRequest() {
		return {
			400: {
				description: 'Bad Request',
				content: {
					'application/json': {
						schema: ApiResponseSchema
					}
				}
			}
		};
	}

	/**
	 * Creates a standardized 401 Unauthorized OpenAPI response.
	 */
	static unauthorized() {
		return {
			401: {
				description: 'Unauthorized',
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
	static forbidden() {
		return {
			403: {
				description: 'Forbidden',
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
	static notFound() {
		return {
			404: {
				description: 'Not Found',
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
