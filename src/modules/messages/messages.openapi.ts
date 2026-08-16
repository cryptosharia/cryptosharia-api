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
import { MESSAGES_ERRORS } from './messages.error';
import {
  MessageCreateBody,
  MessageIdParam,
  MessageResponse,
  MessagesQuery,
} from './messages.schemas';

const protectedSecurity: { [key: string]: string[] }[] = [
  { ApiKeyAuth: [], BearerAuth: [] },
];
const apiKeySecurity: { [key: string]: string[] }[] = [{ ApiKeyAuth: [] }];

export const messagesRouteConfig: RouteConfig[] = [
  {
    method: 'post',
    path: '/messages',
    summary: 'Kirim pesan',
    description: 'Menyimpan pesan contact form dan mengirim notifikasi email.',
    security: apiKeySecurity,
    request: {
      body: { content: { 'application/json': { schema: MessageCreateBody } } },
    },
    responses: createResponsesConfig({
      201: {
        description: 'Pesan terkirim',
        body: MessageResponse,
      },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
    }),
  },
  {
    method: 'get',
    path: '/messages',
    summary: 'List pesan',
    description:
      'Menampilkan pesan dengan search, filter pengirim, dan pagination.',
    security: protectedSecurity,
    request: { query: MessagesQuery },
    responses: createResponsesConfig({
      200: {
        description: 'Pesan berhasil ditampilkan',
        body: z.array(MessageResponse),
        headers: { 'total-items': z.string() },
      },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
    }),
  },
  {
    method: 'get',
    path: '/messages/{id}',
    summary: 'Detail pesan',
    description: 'Menampilkan detail pesan berdasarkan ID.',
    security: protectedSecurity,
    request: { params: MessageIdParam },
    responses: createResponsesConfig({
      200: { description: 'Pesan ditemukan', body: MessageResponse },
      400: {
        description: APP_ERRORS.VALIDATION_FAILED,
        body: ValidationFailedResponse,
      },
      401: { description: APP_ERRORS.UNAUTHORIZED, body: UnauthorizedResponse },
      403: { description: APP_ERRORS.FORBIDDEN, body: ForbiddenResponse },
      404: {
        description: MESSAGES_ERRORS.MESSAGE_NOT_FOUND,
        body: createErrorResponse(MESSAGES_ERRORS, ['MESSAGE_NOT_FOUND']),
      },
    }),
  },
];
