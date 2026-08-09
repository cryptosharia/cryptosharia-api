import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import { UserParam, UserResponse } from './users.schemas';
import { USERS_ERRORS } from './users.error';

export const usersRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/users',
    summary: 'List users',
    description: 'Retrieve all registered users.',
    responses: createResponsesConfig({
      200: { description: 'List of users', schema: z.array(UserResponse) },
    }),
  },
  {
    method: 'get',
    path: '/users/{id}',
    summary: 'Get user by ID',
    description: 'Retrieve a single registered user.',
    request: { params: UserParam },
    responses: createResponsesConfig({
      200: { description: 'User found', schema: UserResponse },
      404: {
        description: USERS_ERRORS.USER_NOT_FOUND,
        schema: createErrorResponse(USERS_ERRORS, ['USER_NOT_FOUND']),
      },
    }),
  },
];
