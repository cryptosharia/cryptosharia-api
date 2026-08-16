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
    "Multipart form-data payload. Must include a file part named 'file'.",
});
const authErrors = {
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
};

export const assetsRouteConfig: RouteConfig[] = [
  {
    method: 'post',
    path: '/assets',
    summary: 'Upload an asset',
    description: 'Upload a file and persist its metadata.',
    security: protectedSecurity,
    request: {
      body: { content: { 'multipart/form-data': { schema: multipartBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Asset uploaded', body: AssetResponse },
      400: {
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
    summary: 'Upload an image through ImgBB',
    description:
      'Upload an image through ImgBB and persist its provider metadata.',
    security: protectedSecurity,
    request: {
      body: { content: { 'multipart/form-data': { schema: multipartBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Image uploaded', body: ImgbbImageResponse },
      400: {
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
