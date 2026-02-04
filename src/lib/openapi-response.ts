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
