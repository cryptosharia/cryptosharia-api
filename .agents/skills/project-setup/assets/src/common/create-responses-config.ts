import { z, type ZodType } from 'zod';
import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';

export type ResponseEntry = {
  description: string;
  body?: ZodType;
  headers?: Record<string, ZodType>;
};

export function createResponsesConfig(
  responses: Record<number, ResponseEntry>,
): Record<string, ResponseConfig> {
  return Object.fromEntries(
    Object.entries(responses).map(([status, entry]) => [
      status,
      {
        description: entry.description,
        ...(entry.body
          ? { content: { 'application/json': { schema: entry.body } } }
          : {}),
        ...(entry.headers ? { headers: z.object(entry.headers) } : {}),
      },
    ]),
  );
}
