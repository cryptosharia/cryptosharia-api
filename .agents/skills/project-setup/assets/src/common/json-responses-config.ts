import type { ZodType } from 'zod';
import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';

const STATUS_TEXT = {
  200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
  401: 'Unauthorized', 404: 'Not Found', 409: 'Conflict',
} as const;
type StatusCode = keyof typeof STATUS_TEXT;

export class JsonResponsesConfig {
  [status: string]: ResponseConfig;

  constructor(responses: Partial<Record<StatusCode, ZodType | null>>) {
    Object.assign(this, Object.fromEntries(
      Object.entries(responses).map(([status, schema]) => [
        status,
        {
          description: STATUS_TEXT[Number(status) as StatusCode],
          ...(schema ? { content: { 'application/json': { schema } } } : {}),
        },
      ]),
    ));
  }
}
