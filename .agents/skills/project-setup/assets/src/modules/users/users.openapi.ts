import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { HttpError } from '#src/common/http-error.schema';
import { JsonResponsesConfig } from '#src/common/json-responses-config';
import { UserParam, UserResponse } from './users.schemas';

export const usersRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/users',
    summary: 'List users',
    description: 'Retrieve all registered users.',
    responses: new JsonResponsesConfig({ 200: z.array(UserResponse) }),
  },
  {
    method: 'get',
    path: '/users/{id}',
    summary: 'Get user by ID',
    description: 'Retrieve a single registered user.',
    request: { params: UserParam },
    responses: new JsonResponsesConfig({ 200: UserResponse, 404: HttpError }),
  },
];
