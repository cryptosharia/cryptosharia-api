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
import { TAGS_ERRORS } from './tags.error';
import {
  TagCreateBody,
  TagDeleteQuery,
  TagIdParam,
  TagInUseDetails,
  TagParam,
  TagResponse,
  TagsQuery,
  TagUpdateBody,
} from './tags.schemas';

const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];
const commonWriteErrors = {
  422: {
    description: APP_ERRORS.VALIDATION_FAILED,
    body: ValidationFailedResponse,
  },
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
};

export const tagsRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/tags',
    summary: 'List tag',
    description: 'Menampilkan tag dengan search, filter slug, dan pagination.',
    request: { query: TagsQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Tag ditampilkan',
        body: z.array(TagResponse),
        headers: { 'total-items': z.string() },
      },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
    }),
  },
  {
    method: 'post',
    path: '/tags',
    summary: 'Buat tag',
    description: 'Membuat tag baru dengan nama, slug, dan deskripsi opsional.',
    security: protectedSecurity,
    request: {
      body: { content: { 'application/json': { schema: TagCreateBody } } },
    },
    responses: createResponsesConfig({
      201: { description: 'Tag dibuat', body: TagResponse },
      ...commonWriteErrors,
      409: {
        description: TAGS_ERRORS.NAME_OR_SLUG_CONFLICT,
        body: createErrorResponse(TAGS_ERRORS, ['NAME_OR_SLUG_CONFLICT']),
      },
    }),
  },
  {
    method: 'get',
    path: '/tags/{identifier}',
    summary: 'Detail tag',
    description: 'Ambil tag berdasarkan ID atau slug.',
    request: { params: TagParam },
    responses: createResponsesConfig({
      200: { description: 'Tag ditemukan', body: TagResponse },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      404: {
        description: TAGS_ERRORS.TAG_NOT_FOUND,
        body: createErrorResponse(TAGS_ERRORS, ['TAG_NOT_FOUND']),
      },
    }),
  },
  {
    method: 'patch',
    path: '/tags/{id}',
    summary: 'Edit tag',
    description: 'Edit tag berdasarkan ID.',
    security: protectedSecurity,
    request: {
      params: TagIdParam,
      body: { content: { 'application/json': { schema: TagUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Tag diubah', body: TagResponse },
      ...commonWriteErrors,
      404: {
        description: TAGS_ERRORS.TAG_NOT_FOUND,
        body: createErrorResponse(TAGS_ERRORS, ['TAG_NOT_FOUND']),
      },
      409: {
        description: TAGS_ERRORS.NAME_OR_SLUG_CONFLICT,
        body: createErrorResponse(TAGS_ERRORS, ['NAME_OR_SLUG_CONFLICT']),
      },
    }),
  },
  {
    method: 'delete',
    path: '/tags/{id}',
    summary: 'Hapus tag',
    description:
      'Hapus tag berdasarkan ID. Default 409 jika masih dipakai; gunakan force=true untuk tetap hapus.',
    security: protectedSecurity,
    request: { params: TagIdParam, query: TagDeleteQuery },
    responses: createResponsesConfig({
      204: { description: 'Tag dihapus' },
      ...commonWriteErrors,
      404: {
        description: TAGS_ERRORS.TAG_NOT_FOUND,
        body: createErrorResponse(TAGS_ERRORS, ['TAG_NOT_FOUND']),
      },
      409: {
        description: TAGS_ERRORS.TAG_IN_USE,
        body: createErrorResponse(TAGS_ERRORS, ['TAG_IN_USE'], TagInUseDetails),
      },
    }),
  },
];
