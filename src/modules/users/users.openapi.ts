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
  { ApiKeyAuth: [] },
  { BearerAuth: [] },
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
    summary: 'List users',
    description: 'List users with search, role/status filters, and pagination.',
    security: protectedSecurity,
    request: { query: UsersQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Users listed',
        body: z.array(UserResponse),
        headers: {
          'total-items': z.string().meta({
            description: 'Total matching users',
          }),
        },
      },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      ...commonErrors,
    }),
  },
  {
    method: 'get',
    path: '/users/{id}',
    summary: 'Get a user',
    description: 'Retrieve a user profile by UUID.',
    security: protectedSecurity,
    request: { params: UserParam },
    responses: createResponsesConfig({
      200: { description: 'User found', body: UserResponse },
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
    summary: 'Update a user profile',
    description: 'Update the display name and/or avatar reference.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: ProfileUpdateBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Profile updated', body: UserResponse },
      400: {
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
    summary: 'Update user status',
    description: 'Change a user account status.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: StatusBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Status updated', body: UserResponse },
      400: {
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
    summary: 'Update user role',
    description: 'Change a user system role.',
    security: protectedSecurity,
    request: {
      params: UserParam,
      body: { content: { 'application/json': { schema: RoleBody } } },
    },
    responses: createResponsesConfig({
      200: { description: 'Role updated', body: UserResponse },
      400: {
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
