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
import { USERS_ERRORS } from './users.error';
import {
  UserParam,
  UserResponse,
  UserUpdateBody,
  UsersQuery,
} from './users.schemas';

const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];
const commonErrors = {
  401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
  403: {
    description: APP_ERRORS.FORBIDDEN,
    body: ForbiddenResponse,
  },
};

export const usersRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/users',
    summary: 'List user',
    description:
      'Menampilkan user dengan search, filter role/status, dan pagination.',
    security: protectedSecurity,
    request: { query: UsersQuery },
    responses: createResponsesConfig({
      200: {
        description: 'User ditampilkan',
        body: z.array(UserResponse),
        headers: {
          'total-items': z.string().meta({
            description: 'Total user (sebelum pagination)',
          }),
        },
      },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      ...commonErrors,
    }),
  },
  {
    method: 'get',
    path: '/users/{id}',
    summary: 'Detail user',
    description: 'Ambil profil user berdasarkan ID.',
    security: protectedSecurity,
    request: { params: UserParam },
    responses: createResponsesConfig({
      200: { description: 'User ditemukan', body: UserResponse },
      ...commonErrors,
      404: {
        description: USERS_ERRORS.USER_NOT_FOUND,
        body: createErrorResponse(USERS_ERRORS, ['USER_NOT_FOUND']),
      },
    }),
  },
  {
    method: 'patch',
    path: '/users/{id}',
    summary: 'Edit user',
    description:
      'Ubah profil, status, dan/atau role user.<br>`status` & `role` hanya bisa diedit oleh akun yang punya akses',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: UserUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'User diubah', body: UserResponse },
      422: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      ...commonErrors,
      404: {
        description: USERS_ERRORS.USER_NOT_FOUND,
        body: createErrorResponse(USERS_ERRORS, ['USER_NOT_FOUND']),
      },
    }),
  },
];
