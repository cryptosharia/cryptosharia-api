import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createResponsesConfig } from '#src/common/create-responses-config';

export const systemRouteConfig: RouteConfig[] = [
  {
    method: 'get',
    path: '/health',
    summary: 'Health check',
    description: 'Returns the API health status.',
    responses: createResponsesConfig({
      200: {
        description: 'API is available',
        body: z.object({ status: z.literal('UP') }),
      },
    }),
  },
];
