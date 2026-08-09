import type { ZodType } from 'zod';
import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';

export type ResponseEntry = {
  description: string;
  schema?: ZodType;
};

export function createResponsesConfig(
  responses: Record<number, ResponseEntry>,
): Record<string, ResponseConfig> {
  return Object.fromEntries(
    Object.entries(responses).map(([status, entry]) => [
      status,
      {
        description: entry.description,
        ...(entry.schema
          ? { content: { 'application/json': { schema: entry.schema } } }
          : {}),
      },
    ]),
  );
}
