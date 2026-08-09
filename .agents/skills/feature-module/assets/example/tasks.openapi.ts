import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createErrorResponse } from '#src/common/create-error-response';
import { createResponsesConfig } from '#src/common/create-responses-config';
import {
  APP_ERRORS,
  UnauthorizedResponse,
  ValidationFailedResponse,
} from '#src/common/error-response.schemas';
import {
  TaskResponse,
  InsertBody,
  UpdateBody,
  TaskParam,
} from './tasks.schemas';
import { TASKS_ERRORS } from './tasks.error';

export const tasksRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/tasks',
    summary: 'List tasks',
    description: 'Retrieve all tasks belonging to the authenticated user.',
    security: [{ BearerAuth: [] }],
    responses: createResponsesConfig({
      200: { description: 'List of tasks', schema: z.array(TaskResponse) },
      401: {
        description: APP_ERRORS.UNAUTHORIZED,
        schema: UnauthorizedResponse,
      },
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
    responses: createResponsesConfig({
      201: { description: 'Task created', schema: TaskResponse },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        schema: ValidationFailedResponse,
      },
      401: {
        description: APP_ERRORS.UNAUTHORIZED,
        schema: UnauthorizedResponse,
      },
      409: {
        description: TASKS_ERRORS.SLUG_UNIQUE_VIOLATION,
        schema: createErrorResponse(TASKS_ERRORS, ['SLUG_UNIQUE_VIOLATION']),
      },
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
    responses: createResponsesConfig({
      200: { description: 'Task found', schema: TaskResponse },
      401: {
        description: APP_ERRORS.UNAUTHORIZED,
        schema: UnauthorizedResponse,
      },
      404: {
        description: TASKS_ERRORS.TASK_NOT_FOUND,
        schema: createErrorResponse(TASKS_ERRORS, ['TASK_NOT_FOUND']),
      },
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
    responses: createResponsesConfig({
      200: { description: 'Task updated', schema: TaskResponse },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        schema: ValidationFailedResponse,
      },
      401: {
        description: APP_ERRORS.UNAUTHORIZED,
        schema: UnauthorizedResponse,
      },
      404: {
        description: TASKS_ERRORS.TASK_NOT_FOUND,
        schema: createErrorResponse(TASKS_ERRORS, ['TASK_NOT_FOUND']),
      },
      409: {
        description: TASKS_ERRORS.SLUG_UNIQUE_VIOLATION,
        schema: createErrorResponse(TASKS_ERRORS, ['SLUG_UNIQUE_VIOLATION']),
      },
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
    responses: createResponsesConfig({
      204: { description: 'Task deleted' },
      401: {
        description: APP_ERRORS.UNAUTHORIZED,
        schema: UnauthorizedResponse,
      },
      404: {
        description: TASKS_ERRORS.TASK_NOT_FOUND,
        schema: createErrorResponse(TASKS_ERRORS, ['TASK_NOT_FOUND']),
      },
    }),
  },
];
