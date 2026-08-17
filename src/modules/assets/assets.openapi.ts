import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  ForbiddenResponse,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import { ASSETS_ERRORS } from './assets.error';
import { AssetResponse, ImgbbImageResponse } from './assets.schemas';

const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];
const multipartBody = z.any().meta({
  description:
    'Payload multipart/form-data. Wajib ada field file bernama `file`.',
});
const authErrors = {
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
};

export const assetsRouteConfig: RouteConfig[] = [
  {
    method: 'post',
    path: '/assets',
    summary: 'Upload file, dapatkan id',
    description: 'Upload file dan dapatkan id-nya.',
    security: protectedSecurity,
    request: {
      body: { content: { 'multipart/form-data': { schema: multipartBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Upload berhasil', body: AssetResponse },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      ...authErrors,
      502: {
        description: ASSETS_ERRORS.STORAGE_UPLOAD_FAILED,
        body: createErrorResponse(ASSETS_ERRORS, ['STORAGE_UPLOAD_FAILED']),
      },
    }),
  },
  {
    method: 'post',
    path: '/imgbb',
    summary: 'Upload gambar, dapatkan url',
    description: 'Upload gambar dan dapatkan url-nya.',
    security: protectedSecurity,
    request: {
      body: { content: { 'multipart/form-data': { schema: multipartBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Upload berhasil', body: ImgbbImageResponse },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      ...authErrors,
      502: {
        description: ASSETS_ERRORS.IMAGE_UPLOAD_FAILED,
        body: createErrorResponse(ASSETS_ERRORS, ['IMAGE_UPLOAD_FAILED']),
      },
    }),
  },
];
