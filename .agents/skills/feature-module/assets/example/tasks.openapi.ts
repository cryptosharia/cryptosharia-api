import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { HttpError, HttpValidationError } from '#src/common/http-error.schema';
import { JsonResponsesConfig } from '#src/common/json-responses-config';
import {
  TaskResponse,
  InsertBody,
  UpdateBody,
  TaskParam,
} from './tasks.schemas';

export const tasksRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/tasks',
    summary: 'List tasks',
    description: 'Retrieve all tasks belonging to the authenticated user.',
    security: [{ BearerAuth: [] }],
    responses: new JsonResponsesConfig({
      200: z.array(TaskResponse),
      401: HttpError,
    }),
  },
  {
    method: 'post',
    path: '/tasks',
    summary: 'Create a task',
    description: 'Create a new task for the authenticated user.',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: InsertBody } },
      },
    },
    responses: new JsonResponsesConfig({
      201: TaskResponse,
      400: HttpValidationError,
      401: HttpError,
      409: HttpError,
    }),
  },
  {
    method: 'get',
    path: '/tasks/{id}',
    summary: 'Get a task by ID',
    description: 'Retrieve a single task by its UUID.',
    security: [{ BearerAuth: [] }],
    request: {
      params: TaskParam,
    },
    responses: new JsonResponsesConfig({
      200: TaskResponse,
      401: HttpError,
      404: HttpError,
    }),
  },
  {
    method: 'put',
    path: '/tasks/{id}',
    summary: 'Update a task',
    description: 'Update one or more fields of an existing task.',
    security: [{ BearerAuth: [] }],
    request: {
      params: TaskParam,
      body: {
        content: { 'application/json': { schema: UpdateBody } },
      },
    },
    responses: new JsonResponsesConfig({
      200: TaskResponse,
      400: HttpValidationError,
      401: HttpError,
      409: HttpError,
      404: HttpError,
    }),
  },
  {
    method: 'delete',
    path: '/tasks/{id}',
    summary: 'Delete a task',
    description: 'Permanently delete a task.',
    security: [{ BearerAuth: [] }],
    request: {
      params: TaskParam,
    },
    responses: new JsonResponsesConfig({
      204: null,
      401: HttpError,
      404: HttpError,
    }),
  },
];
