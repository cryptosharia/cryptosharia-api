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
import { POSTS_ERRORS } from './posts.error';
import {
  PostCreateBody,
  PostDetail,
  PostIdParam,
  PostListItem,
  PostParam,
  PostsQuery,
  PostUpdateBody,
} from './posts.schemas';

const publicReadSecurity: { [key: string]: string[] }[] = [{ ApiKeyAuth: [] }];
const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];

const commonValidationError = {
  422: {
    description: APP_ERRORS.VALIDATION_FAILED,
    body: ValidationFailedResponse,
  },
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
};

export const postsRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/posts',
    summary: 'List post',
    description:
      'Menampilkan post dengan filter status, kategori, tipe, slug, tag, sorting, dan pagination. Akun tanpa izin akses hanya post berstatus `published` yang ditampilkan.',
    security: publicReadSecurity,
    request: { query: PostsQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Post berhasil ditampilkan',
        body: z.array(PostListItem),
        headers: { 'total-items': z.string() },
      },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
    }),
  },
  {
    method: 'post',
    path: '/posts',
    summary: 'Buat post',
    description: 'Membuat post baru.',
    security: protectedSecurity,
    request: {
      body: { content: { 'application/json': { schema: PostCreateBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Post dibuat', body: PostDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      409: {
        description: POSTS_ERRORS.SLUG_CONFLICT,
        body: createErrorResponse(POSTS_ERRORS, ['SLUG_CONFLICT']),
      },
    }),
  },
  {
    method: 'get',
    path: '/posts/{identifier}',
    summary: 'Detail post',
    description:
      'Ambil post berdasarkan ID atau slug. Post non-published hanya dapat diakses dengan akun yang punya izin akses.',
    security: publicReadSecurity,
    request: { params: PostParam },
    responses: createResponsesConfig({
      200: { description: 'Post ditemukan', body: PostDetail },
      ...commonValidationError,
      404: {
        description: POSTS_ERRORS.POST_NOT_FOUND,
        body: createErrorResponse(POSTS_ERRORS, ['POST_NOT_FOUND']),
      },
    }),
  },
  {
    method: 'patch',
    path: '/posts/{id}',
    summary: 'Edit post',
    description:
      'Edit post berdasarkan ID.<br>Ketika tags disertakan, seluruh tag di-replace.',
    security: protectedSecurity,
    request: {
      params: PostIdParam,
      body: { content: { 'application/json': { schema: PostUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Post diubah', body: PostDetail },
      ...commonValidationError,
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: POSTS_ERRORS.POST_NOT_FOUND,
        body: createErrorResponse(POSTS_ERRORS, ['POST_NOT_FOUND']),
      },
      409: {
        description: POSTS_ERRORS.SLUG_CONFLICT,
        body: createErrorResponse(POSTS_ERRORS, ['SLUG_CONFLICT']),
      },
    }),
  },
  {
    method: 'delete',
    path: '/posts/{id}',
    summary: 'Hapus post',
    description: 'Hapus post berdasarkan ID.',
    security: protectedSecurity,
    request: { params: PostIdParam },
    responses: createResponsesConfig({
      204: { description: 'Post dihapus' },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: POSTS_ERRORS.POST_NOT_FOUND,
        body: createErrorResponse(POSTS_ERRORS, ['POST_NOT_FOUND']),
      },
    }),
  },
];
