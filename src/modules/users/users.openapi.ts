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
  ProfileUpdateBody,
  RoleBody,
  StatusBody,
  UserParam,
  UserResponse,
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
    summary: 'Edit profil user',
    description: 'Ubah nama dan/atau avatar.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: ProfileUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Profil diubah', body: UserResponse },
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
  {
    method: 'put',
    path: '/users/{id}/status',
    summary: 'Edit status user',
    description: 'Ubah status akun.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: StatusBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Status diubah', body: UserResponse },
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
  {
    method: 'put',
    path: '/users/{id}/role',
    summary: 'Edit role user',
    description: 'Ubah role user.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: RoleBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Role diubah', body: UserResponse },
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
